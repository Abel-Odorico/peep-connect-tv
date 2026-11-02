import json
import tempfile
import time
import unittest
from unittest.mock import patch
from pathlib import Path
from youtube_service import YouTube, YouTubeError, SCOPE

class DeviceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.yt = YouTube(self.tmp.name)
        self.yt.private.mkdir()
        (self.yt.private / 'google-tv-client.json').write_text(json.dumps({'installed': {'client_id': 'test.apps.googleusercontent.com', 'client_secret': 'fixture-secret'}}))
        self.start = {'device_code': 'private-device-fixture', 'user_code': 'ABCD-EFGH', 'verification_url': 'https://www.google.com/device', 'expires_in': 600, 'interval': 5}

    def begin(self):
        with patch.object(self.yt, 'device_request', return_value=self.start):
            return self.yt.device_begin()

    def poll(self, result):
        self.yt.device_attempt['next'] = 0
        with patch.object(self.yt, 'device_request', return_value=result):
            return self.yt.device_poll(self.yt.device_attempt['id'])

    def test_config_and_code_do_not_expose_credentials(self):
        data = self.begin()
        self.assertTrue(self.yt.status()['deviceConfigured'])
        for secret in ['private-device-fixture', 'fixture-secret', 'client_id']:
            self.assertNotIn(secret, json.dumps(data))
        with patch.object(self.yt, 'device_request') as request:
            self.assertEqual(self.yt.device_begin()['id'], data['id'])
            self.yt.device_poll(data['id'])
            request.assert_not_called()

    def test_pending_slowdown_and_expiry(self):
        self.begin()
        self.assertEqual(self.poll({'error': 'authorization_pending'})['status'], 'pending')
        self.assertEqual(self.poll({'error': 'slow_down'})['interval'], 10)
        self.yt.device_attempt['expires'] = 0
        self.assertEqual(self.yt.device_poll(self.yt.device_attempt['id'])['status'], 'expired')

    def test_success_private_tokens_and_device_refresh(self):
        self.begin()
        result = self.poll({'access_token': 'fixture-access', 'refresh_token': 'fixture-refresh', 'scope': SCOPE, 'expires_in': 1})
        self.assertEqual(result, {'status': 'connected'})
        self.assertEqual(self.yt.tokens()['_client_kind'], 'device')
        self.assertTrue(self.yt.status()['connected'])
        with patch.object(self.yt, 'request', return_value={'access_token': 'new-fixture', 'expires_in': 3600}) as request:
            self.assertEqual(self.yt.access_token(), 'new-fixture')
            self.assertEqual(request.call_args.args[1]['client_id'], 'test.apps.googleusercontent.com')
        self.assertEqual((self.yt.private / 'youtube-tokens.json').stat().st_mode & 0o777, 0o600)

    def test_denial_missing_scope_and_cancel_never_store_tokens(self):
        for result in [{'error':'access_denied'}, {'access_token':'fixture', 'refresh_token':'fixture', 'scope':'profile'}]:
            self.yt.device_attempt = None
            self.yt.device_start_after = 0
            self.begin()
            self.assertIn(self.poll(result)['status'], ['denied', 'error'])
            self.assertEqual(self.yt.tokens(), {})
        session = self.yt.device_attempt['id']
        self.yt.device_cancel(session)
        self.assertEqual(self.yt.device_poll(session)['status'], 'expired')

    def test_cancel_during_network_prevents_token_save(self):
        data = self.begin()
        self.yt.device_attempt['next'] = 0
        def response(*args):
            self.yt.device_cancel(data['id'])
            return {'access_token':'fixture','refresh_token':'fixture','scope':SCOPE}
        with patch.object(self.yt, 'device_request', side_effect=response):
            self.assertEqual(self.yt.device_poll(data['id'])['status'], 'expired')
        self.assertEqual(self.yt.tokens(), {})

    def test_untrusted_verification_url_rejected(self):
        self.start['verification_url'] = 'https://untrusted.invalid/device'
        with self.assertRaises(YouTubeError):
            self.begin()
