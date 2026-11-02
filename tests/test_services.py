import io
import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from youtube_service import YouTube, YouTubeError, SCOPE


class YouTubeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.yt = YouTube(self.temp.name)
        self.yt.private.mkdir()
        (self.yt.private / 'google-client.json').write_text(json.dumps({'installed': {'client_id': 'test.apps.googleusercontent.com', 'client_secret': 'test-secret'}}))

    def test_missing_configuration_is_explicit(self):
        (self.yt.private / 'google-client.json').unlink()
        self.assertEqual(self.yt.status(), {'configured': False, 'apiConfigured': False, 'connected': False, 'account': None})
        with self.assertRaises(YouTubeError):
            self.yt.begin(8770)

    def test_oauth_pkce_cookie_state_and_single_use(self):
        url, state = self.yt.begin(8770)
        params = parse_qs(urlsplit(url).query)
        self.assertEqual(params['scope'], [SCOPE])
        self.assertEqual(params['code_challenge_method'], ['S256'])
        self.assertNotIn('client_secret', params)
        with self.assertRaises(YouTubeError):
            self.yt.callback({'state': [state], 'code': ['example']}, 'wrong-browser')
        with patch.object(self.yt, 'request', return_value={'access_token': 'test-token', 'refresh_token': 'test-refresh', 'scope': SCOPE, 'expires_in': 3600}) as request:
            self.yt.callback({'state': [state], 'code': ['example']}, state)
            self.assertIn('code_verifier', request.call_args.args[1])
            with self.assertRaises(YouTubeError):
                self.yt.callback({'state': [state], 'code': ['example']}, state)
        self.assertEqual(os.stat(self.yt.private / 'youtube-tokens.json').st_mode & 0o777, 0o600)
        self.assertNotIn('access_token', json.dumps(self.yt.status()))

    def test_denied_scope_does_not_save_credentials(self):
        _, state = self.yt.begin(8770)
        with patch.object(self.yt, 'request', return_value={'access_token': 'example', 'scope': 'unrelated'}):
            with self.assertRaises(YouTubeError):
                self.yt.callback({'state': [state], 'code': ['example']}, state)
        self.assertFalse(self.yt.tokens())

    def test_feed_cache_sanitizes_videos_and_disconnect_clears_it(self):
        self.yt.save_tokens({'access_token': 'test-token', 'expires_at': time.time() + 3600})
        channel = 'UC' + 'a' * 22
        def api(resource, **params):
            if resource == 'channels' and params.get('mine'):
                return {'items': [{'snippet': {'title': 'Canal de teste'}}]}
            if resource == 'subscriptions':
                return {'items': [{'snippet': {'resourceId': {'channelId': channel}}}]}
            return {'items': [{'contentDetails': {'relatedPlaylists': {'uploads': 'UUexample'}}}]}
        response = {'items': [{'contentDetails': {'videoId': 'abcdefghijk', 'videoPublishedAt': '2026-10-31T00:00:00Z'}, 'snippet': {'title': 'Vídeo', 'channelTitle': 'Canal', 'thumbnails': {'medium': {'url': 'https://untrusted.invalid/tracker'}}}}, {'contentDetails': {'videoId': 'invalid'}, 'snippet': {'thumbnails': {'medium': {}}}}]}
        with patch.object(self.yt, 'api', side_effect=api), patch.object(self.yt, 'access_token', return_value='fake'), patch.object(self.yt, 'request', return_value=response) as request:
            feed = self.yt.feed()
            self.assertEqual(len(feed['results']), 1)
            self.assertEqual(feed['results'][0]['thumbnail'], 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg')
            self.assertNotIn('fake', json.dumps(feed))
            self.assertEqual(self.yt.feed(), feed)
            self.assertEqual(request.call_count, 1)
        self.yt.disconnect()
        self.assertFalse(self.yt.tokens())
        self.assertIsNone(self.yt.feed_cache)


class HandlerTests(unittest.TestCase):
    def call(self, path, method='GET', headers=None):
        handler = server.Handler.__new__(server.Handler)
        handler.path, handler.headers = path, {'Host': '127.0.0.1:8770', **(headers or {})}
        result = {}
        handler.send_response = lambda status: result.update(status=status)
        handler.send_header = lambda *args: None
        handler.end_headers = lambda: None
        handler.wfile = io.BytesIO()
        getattr(handler, 'do_' + method)()
        return result['status'], json.loads(handler.wfile.getvalue())

    def test_no_private_files_or_cross_origin_access(self):
        for path in ['/../.private/tmdb.key', '/%2e%2e/.private/google-client.json', '/.private/youtube-tokens.json']:
            self.assertEqual(self.call(path)[0], 404)
        self.assertEqual(self.call('/api/youtube/status', headers={'Origin': 'https://untrusted.invalid'})[0], 403)

    def test_disconnect_requires_same_origin_and_explicit_header(self):
        self.assertEqual(self.call('/api/youtube/disconnect', 'POST')[0], 403)
        with patch.object(server.YOUTUBE, 'disconnect') as disconnect:
            self.assertEqual(self.call('/api/youtube/disconnect', 'POST', {'Origin': 'http://127.0.0.1:8770', 'X-Konka-Action': 'disconnect'})[0], 200)
            disconnect.assert_called_once()

    def test_memory_snapshot_parses_pss_without_mutation(self):
        result = type('Result', (), {'returncode': 0, 'stdout': 'Total PSS by process:\n  123,456K: com.google.android.tvlauncher (pid 120 / activities)\n  12,345K: system (pid 1)\nTotal PSS by OOM adjustment:\n'})()
        with patch.object(server.subprocess, 'run', return_value=result) as run:
            data = server.memory_processes()
            self.assertEqual(data['processes'][0]['pssKiB'], 123456)
            self.assertEqual(run.call_args.args[0][-1], 'dumpsys meminfo')


if __name__ == '__main__':
    unittest.main()
