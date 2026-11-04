import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit, parse_qs
from youtube_service import YouTube, YouTubeError

CID = 'UC' + 'a' * 22

class ChannelStatsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.yt = YouTube(self.temp.name)
        self.calls = []

    def request(self, url):
        self.calls.append(url)
        if '/channels?' in url:
            return {'items': [{'id': CID, 'snippet': {'title': 'Test', 'customUrl': '@test'}, 'statistics': {'viewCount': '1000', 'subscriberCount': '500', 'videoCount': '2'}, 'contentDetails': {'relatedPlaylists': {'uploads': 'uploads'}}}]}
        if '/playlistItems?' in url:
            return {'items': [{'contentDetails': {'videoId': 'abcdefghijk'}}]}
        return {'items': [{'id': 'abcdefghijk', 'snippet': {'title': 'Video'}, 'statistics': {'viewCount': '0', 'commentCount': '2'}}]}

    def test_selectors_and_external_urls(self):
        self.assertEqual(self.yt.channel_selector('https://www.youtube.com/@teste/videos'), {'forHandle': '@teste'})
        self.assertEqual(self.yt.channel_selector('youtube.com/channel/' + CID), {'id': CID})
        self.assertEqual(self.yt.channel_selector('https://youtube.com/user/test'), {'forUsername': 'test'})
        for bad in ('https://evil.com/@test', 'https://youtube.com.evil.com/@test', 'https://youtube.com/watch?v=test', 'Test Name', '', 'https://youtube.com:bad/@test', 'https://user@youtube.com/@test'):
            with self.subTest(bad=bad), self.assertRaises(YouTubeError):
                self.yt.channel_selector(bad)

    def test_public_cache_no_token_and_missing_counts(self):
        with patch.object(self.yt, 'api_key', return_value='private-key'), patch.object(self.yt, 'request', side_effect=self.request), patch.object(self.yt, 'access_token', side_effect=AssertionError('must not use OAuth')):
            data = self.yt.channel_stats('@test')
            self.assertEqual(data['subscribers'], 500)
            self.assertEqual(data['videos'][0]['views'], 0)
            self.assertIsNone(data['videos'][0]['likes'])
            self.assertFalse(data['analyticsAvailable'])
            self.assertNotIn('private-key', str(data))
            self.assertTrue(self.yt.channel_stats('@test')['cached'])
            self.assertEqual(len(self.calls), 3)
            self.assertEqual(parse_qs(urlsplit(self.calls[0]).query)['forHandle'], ['@test'])

    def test_hidden_subscribers_and_partial_videos(self):
        def request(url):
            if '/channels?' not in url:
                raise YouTubeError('quota', 429)
            data = self.request(url)
            data['items'][0]['statistics']['hiddenSubscriberCount'] = True
            return data
        with patch.object(self.yt, 'api_key', return_value='private'), patch.object(self.yt, 'request', side_effect=request):
            data = self.yt.channel_stats('@test')
            self.assertTrue(data['partial'])
            self.assertIsNone(data['subscribers'])
            self.assertEqual(data['views'], 1000)

    def test_missing_key_and_unknown_channel(self):
        with patch.object(self.yt, 'api_key', return_value=''), self.assertRaises(YouTubeError) as error:
            self.yt.channel_stats('@test')
        self.assertEqual(error.exception.status, 503)
        with patch.object(self.yt, 'api_key', return_value='private'), patch.object(self.yt, 'request', return_value={'items': []}), self.assertRaises(YouTubeError) as error:
            self.yt.channel_stats('@test')
        self.assertEqual(error.exception.status, 404)
