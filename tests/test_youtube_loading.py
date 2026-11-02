"""Loading contract: API-key public data versus explicitly authorized account."""
import io
import json
import sys
import tempfile
import time
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from youtube_service import SCOPE, YouTube, YouTubeError


class LoadingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.yt = YouTube(self.temp.name)
        self.yt.private.mkdir()
        self.key = 'AIza' + 'a' * 35
        (self.yt.private / 'youtube.key').write_text(self.key)

    def configure_account(self):
        (self.yt.private / 'google-client.json').write_text(json.dumps({'installed': {'client_id': 'example.apps.googleusercontent.com'}}))
        self.yt.save_tokens({'access_token': 'test-access', 'refresh_token': 'test-refresh', 'expires_at': time.time() + 3600})

    def test_key_does_not_claim_account_identity(self):
        status = self.yt.status()
        self.assertTrue(status['apiConfigured'])
        self.assertFalse(status['connected'])
        self.assertIsNone(status['account'])
        self.assertNotIn(self.key, json.dumps(status))

    def test_public_data_loads_without_oauth_and_is_cached(self):
        response = {'items': [{'id': 'abcdefghijk', 'snippet': {'title': 'Exemplo público', 'channelTitle': 'Canal', 'publishedAt': '2026-10-31T00:00:00Z'}}, {'id': '<script>', 'snippet': {}}]}
        with patch.object(self.yt, 'request', return_value=response) as request:
            data = self.yt.feed()
            params = parse_qs(urlsplit(request.call_args.args[0]).query)
            self.assertEqual(params['chart'], ['mostPopular'])
            self.assertEqual(params['regionCode'], ['BR'])
            self.assertEqual(len(data['results']), 1)
            self.assertFalse(data['personalized'])
            self.assertEqual(data['mode'], 'popular')
            self.assertIsNone(data['account'])
            self.assertNotIn(self.key, json.dumps(data))
            self.assertEqual(self.yt.feed(), data)
            self.assertEqual(request.call_count, 1)

    def test_authorized_identity_and_feed_are_selected(self):
        self.configure_account()
        self.yt.feed_cache = {'account': 'Canal autorizado', 'mode': 'subscriptions', 'at': time.time(), 'results': []}
        self.assertEqual(self.yt.status()['account'], 'Canal autorizado')
        with patch.object(self.yt, 'public_feed') as public:
            self.assertEqual(self.yt.feed()['mode'], 'subscriptions')
            public.assert_not_called()
        self.yt.disconnect()
        self.assertFalse(self.yt.status()['connected'])
        self.assertIsNone(self.yt.status()['account'])

    def test_official_account_picker_and_minimal_scope(self):
        self.configure_account()
        url, state = self.yt.begin(8770)
        params = parse_qs(urlsplit(url).query)
        self.assertIn('select_account', params['prompt'][0])
        self.assertEqual(params['scope'], [SCOPE])
        self.assertEqual(params['code_challenge_method'], ['S256'])
        self.assertEqual(params['state'], [state])
        self.assertNotIn('client_secret', params)

    def test_wrong_browser_and_denied_scope_do_not_connect(self):
        self.configure_account()
        self.yt.disconnect()
        _, state = self.yt.begin(8770)
        with self.assertRaises(YouTubeError):
            self.yt.callback({'state': [state], 'code': ['example']}, 'wrong-browser')
        with patch.object(self.yt, 'request', return_value={'access_token': 'not-authorized', 'scope': 'unrelated'}):
            with self.assertRaises(YouTubeError):
                self.yt.callback({'state': [state], 'code': ['example']}, state)
        self.assertFalse(self.yt.status()['connected'])

    def test_public_quota_failure_is_actionable_without_key_leak(self):
        error = urllib.error.HTTPError('https://www.googleapis.com/example', 403, 'Forbidden', {}, io.BytesIO(json.dumps({'error': {'errors': [{'reason': 'quotaExceeded'}]}}).encode()))
        with patch('youtube_service.urllib.request.urlopen', side_effect=error):
            with self.assertRaises(YouTubeError) as raised:
                self.yt.public_feed()
        self.assertEqual(raised.exception.status, 429)
        self.assertIn('cota', raised.exception.message)
        self.assertNotIn(self.key, raised.exception.message)

    def test_missing_key_is_explicit(self):
        (self.yt.private / 'youtube.key').unlink()
        with patch.dict('os.environ', {'YOUTUBE_API_KEY': ''}):
            with self.assertRaises(YouTubeError) as raised:
                self.yt.feed()
        self.assertEqual(raised.exception.status, 503)


if __name__ == '__main__':
    unittest.main()
