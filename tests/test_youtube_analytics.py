import json
import tempfile
import time
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit
from youtube_service import YouTube, YouTubeError, SCOPE, ANALYTICS_SCOPE
from youtube_analytics import METRICS, rows
import server

A, B = 'UC' + 'a' * 22, 'UC' + 'b' * 22


def report(columns, values):
    return {'columnHeaders': [{'name': name} for name in columns.split(',')], 'rows': values}


class AnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.yt = YouTube(self.temp.name)
        self.yt.private.mkdir()
        (self.yt.private / 'google-client.json').write_text(json.dumps({'installed': {'client_id': 'test.apps.googleusercontent.com'}}))
        for cid in (A, B):
            self.yt.save_account({'id': cid, 'title': 'Test'}, {'access_token': 'base-' + cid, 'scope': SCOPE})
        state = self.yt.accounts_data()
        state['accounts'][A]['analytics_tokens'] = {'access_token': 'analytics-A', 'scope': SCOPE + ' ' + ANALYTICS_SCOPE, 'expires_at': time.time() + 3600}
        self.yt.write_accounts(state)
        self.calls = []

    def request(self, url, form=None, token=None):
        self.calls.append((url, token))
        query = parse_qs(urlsplit(url).query)
        if '/youtube/v3/videos?' in url:
            return {'items': [{'id': 'abcdefghijk', 'snippet': {'title': 'Title'}}]}
        self.assertEqual(token, 'analytics-A')
        self.assertEqual(query['ids'], ['channel==' + A])
        columns = query['metrics'][0]
        dimension = query.get('dimensions', [''])[0]
        if dimension == 'day':
            return report('day,' + columns, [['2026-11-10', 100, 120, 72, 55, 7, 2, 10, 4, 3]])
        if not dimension:
            return report(columns, [[100, 120, 72, 55, 7, 2, 10, 4, 3]])
        value = {'video': 'abcdefghijk', 'country': 'BR', 'deviceType': 'TV', 'insightTrafficSourceType': 'YT_SEARCH'}[dimension]
        return report(dimension + ',' + columns, [[value, 100, 120] + ([72, 55] if len(columns.split(',')) == 4 else [])])

    def test_real_units_period_account_binding_cache_and_manual_refresh(self):
        with patch.object(self.yt, 'request', side_effect=self.request):
            data = self.yt.analytics.report(A)
            self.assertEqual(data['totals']['watchHours'], 2)
            self.assertEqual(data['totals']['netSubscribers'], 5)
            self.assertEqual(data['totals']['averageViewDuration'], 72)
            self.assertEqual(data['availableThrough'], '2026-11-10')
            self.assertEqual(data['topVideos'][0]['title'], 'Title')
            self.assertEqual(len(self.calls), 7)
            self.assertEqual(self.yt.accounts_data()['active'], B, 'Queries must not switch the active account')
            self.assertTrue(self.yt.analytics.report(A)['cached'])
            self.assertTrue(self.yt.analytics.report(A, force=True)['refreshLimited'])
            self.assertEqual(len(self.calls), 7)
            data['at'] -= 61
            self.assertFalse(self.yt.analytics.report(A, force=True)['cached'])
            self.assertEqual(len(self.calls), 14)
            from datetime import date
            self.assertEqual((date.fromisoformat(data['endDate'])-date.fromisoformat(data['startDate'])).days, 27)
            self.assertNotIn('analytics-A', json.dumps(data))

    def test_missing_scope_public_channel_invalid_period_and_disconnected_cache(self):
        for cid, days in ((B, 28), ('UC' + 'c'*22, 28), (A, 'anything'), ('@public', 28)):
            with self.subTest(cid=cid, days=days), patch.object(self.yt, 'request') as request, self.assertRaises(YouTubeError):
                self.yt.analytics.report(cid, days)
            request.assert_not_called()
        with patch.object(self.yt, 'request', side_effect=self.request):
            self.yt.analytics.report(A)
        state = self.yt.accounts_data(); del state['accounts'][A]; self.yt.write_accounts(state)
        with self.assertRaises(YouTubeError):
            self.yt.analytics.report(A)

    def test_optional_failure_empty_rows_and_zero_are_not_fabricated(self):
        def empty(url, **kwargs):
            if 'deviceType' in url:
                raise YouTubeError('Relatório de dispositivos indisponível')
            return {'columnHeaders': [], 'rows': []}
        with patch.object(self.yt, 'request', side_effect=empty):
            data = self.yt.analytics.report(A)
        self.assertIsNone(data['totals']['watchHours'])
        self.assertIsNone(data['availableThrough'])
        self.assertIn('devices', data['errors'])
        self.assertEqual(data['daily'], [])
        self.assertEqual(rows(report('views,likes', [[0, None]])), [{'views': 0, 'likes': None}])

    def test_consent_is_explicit_separate_and_rejects_wrong_channel(self):
        url, _ = self.yt.begin(8770)
        self.assertNotIn(ANALYTICS_SCOPE, parse_qs(urlsplit(url).query)['scope'][0])
        url, state = self.yt.begin(8770, analytics=True, channel=B)
        self.assertIn(ANALYTICS_SCOPE, parse_qs(urlsplit(url).query)['scope'][0])
        tokens = {'access_token': 'new', 'refresh_token': 'refresh', 'scope': SCOPE+' '+ANALYTICS_SCOPE}
        before = self.yt.accounts_data()
        with patch.object(self.yt, 'request', return_value=tokens), patch.object(self.yt, 'channel_for_token', return_value={'id': A}), self.assertRaises(YouTubeError):
            self.yt.callback({'state': [state], 'code': ['test']}, state)
        self.assertEqual(before, self.yt.accounts_data())
        _, state = self.yt.begin(8770, analytics=True, channel=B)
        with patch.object(self.yt, 'request', return_value=tokens), patch.object(self.yt, 'channel_for_token', return_value={'id': B}):
            self.yt.callback({'state': [state], 'code': ['test']}, state)
        after = self.yt.accounts_data()
        self.assertEqual(after['accounts'][B]['tokens'], before['accounts'][B]['tokens'])
        self.assertEqual(after['accounts'][A], before['accounts'][A])
        self.assertTrue(after['accounts'][B]['analytics_tokens'])
        self.yt.save_account({'id': B, 'title': 'New name'}, {'scope': SCOPE})
        self.assertIn('analytics_tokens', self.yt.accounts_data()['accounts'][B])

    def test_refresh_updates_requested_channel_only(self):
        state = self.yt.accounts_data()
        state['accounts'][A]['analytics_tokens'].update(expires_at=0, refresh_token='refresh-A')
        before_b = state['accounts'][B]
        self.yt.write_accounts(state)
        with patch.object(self.yt, 'request', return_value={'access_token': 'renewed', 'expires_in': 3600}):
            self.assertEqual(self.yt.analytics.token(A), 'renewed')
        after = self.yt.accounts_data()
        self.assertEqual(after['active'], B)
        self.assertEqual(after['accounts'][B], before_b)
        self.assertEqual(after['accounts'][A]['analytics_tokens']['refresh_token'], 'refresh-A')

    def test_bitcoin_and_freshness(self):
        from ambient_data import annotate_markets
        with patch.object(server, 'remote_json', return_value={'data': {'currency': 'BTC', 'rates': {'USD': '100000', 'BRL': '500000'}}}):
            data = server.bitcoin_quote()
        self.assertEqual(data['value'], 100000)
        self.assertIsNone(data['sourceAt'])
        annotated = annotate_markets({'items': {'btc': {'ok': True, **data}}})
        self.assertFalse(annotated['items']['btc']['stale'])
        self.assertFalse(annotated['items']['btc']['sourceTimeAvailable'])
        data['brl'] = float('nan')
        self.assertFalse(annotate_markets({'items': {'btc': {'ok': True, **data}}})['items']['btc']['ok'])
