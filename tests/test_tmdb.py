import sys
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tmdb_service import TMDB, TMDBError


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.request = Mock(return_value={'results': [{'id': 10, 'title': 'Teste', 'release_date': '2026-11-01', 'poster_path': '/poster.jpg'}]})
        self.api = TMDB(Path(self.tmp.name), self.request)
        env = patch.dict('os.environ', {'TMDB_API_KEY': 'a' * 32})
        env.start()
        self.addCleanup(env.stop)

    def test_upcoming_uses_date_window_and_brazil_release_types(self):
        result = self.api.catalog('movie', collection='upcoming')
        params = parse_qs(urlsplit(self.request.call_args.args[0]).query)
        self.assertEqual(params['region'], ['BR'])
        self.assertEqual(params['with_release_type'], ['2|3'])
        self.assertEqual(params['primary_release_date.gte'], params['release_date.gte'])
        self.assertLess(params['release_date.gte'], params['release_date.lte'])
        self.assertNotIn('api_key', str(result))
        self.api.catalog('movie', collection='upcoming')
        self.assertEqual(self.request.call_count, 1)

    def test_tv_categories_have_independent_cache_and_safe_filters(self):
        self.api.catalog('tv', '8', 'top')
        params = parse_qs(urlsplit(self.request.call_args.args[0]).query)
        self.assertEqual(params['vote_count.gte'], ['300'])
        self.assertEqual(params['watch_region'], ['BR'])
        self.assertIn('first_air_date.lte', params)
        self.api.catalog('tv', '8', 'recent')
        self.assertEqual(self.request.call_count, 2)
        for args in [('bad', '', 'popular'), ('movie', '9999', 'popular'), ('tv', '', 'invalid')]:
            with self.assertRaises(TMDBError):
                self.api.catalog(*args)
        with self.assertRaises(TMDBError):
            self.api.details('movie', '../private')
        self.assertEqual(self.request.call_count, 2)

    def test_trailer_prefers_official_portuguese_and_rejects_injected_urls(self):
        videos = [
            {'site': 'YouTube', 'key': 'englishabcd', 'type': 'Trailer', 'official': True, 'iso_639_1': 'en'},
            {'site': 'YouTube', 'key': 'portugues12', 'type': 'Trailer', 'official': True, 'iso_639_1': 'pt'},
            {'site': 'YouTube', 'key': 'https://bad.invalid', 'type': 'Trailer', 'official': True, 'iso_639_1': 'pt'},
        ]
        self.assertEqual(TMDB.trailer(videos)['url'], 'https://www.youtube.com/watch?v=portugues12')
        self.assertIsNone(TMDB.trailer([videos[-1]]))

    def test_details_combine_metadata_providers_and_trailer_in_one_request(self):
        self.request.return_value = {'id': 10, 'name': 'Série', 'number_of_seasons': 2, 'number_of_episodes': 16, 'genres': [{'name': 'Drama'}], 'credits': {'cast': [{'name': 'Pessoa'}]}, 'content_ratings': {'results': [{'iso_3166_1': 'BR', 'rating': '14'}]}, 'watch/providers': {'results': {'BR': {'flatrate': [{'provider_name': 'Netflix', 'logo_path': '/logo.jpg'}], 'rent': [{'provider_name': 'Loja'}]}}}}
        d = self.api.details('tv', '10')
        self.assertEqual(d['seasons'], 2)
        self.assertEqual(d['certification'], '14')
        self.assertEqual(d['providers']['flatrate'][0]['name'], 'Netflix')
        self.assertIsNone(d['trailer'])
        self.api.details('tv', 10)
        self.assertEqual(self.request.call_count, 1)
        params = parse_qs(urlsplit(self.request.call_args.args[0]).query)
        self.assertIn('videos', params['append_to_response'][0])

    def test_cache_coalesces_concurrent_requests_and_remains_bounded(self):
        entered, release = threading.Event(), threading.Event()
        def load():
            entered.set()
            release.wait(2)
            return {'ok': True}
        with ThreadPoolExecutor(max_workers=3) as pool:
            first = pool.submit(self.api.remember, 'shared', 60, load)
            self.assertTrue(entered.wait(1))
            second = pool.submit(self.api.remember, 'shared', 60, lambda: self.fail('duplicate load'))
            release.set()
            self.assertEqual(first.result(), second.result())
        for i in range(70):
            self.api.remember(('item', i), 60, lambda: i)
        self.assertEqual(len(self.api.cache), 64)

    def test_failed_requests_are_not_cached(self):
        self.request.side_effect = TMDBError('Indisponível')
        for _ in range(2):
            with self.assertRaises(TMDBError):
                self.api.catalog('movie')
        self.assertEqual(self.request.call_count, 2)
        self.assertFalse(self.api.pending)


if __name__ == '__main__':
    unittest.main()
