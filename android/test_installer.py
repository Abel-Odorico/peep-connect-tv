import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('installer', Path(__file__).with_name('instalar_tv.py'))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallerSafetyTests(unittest.TestCase):
    def setUp(self):
        self.device_patch = patch.multiple(installer, KNOWN_DEVICE="192.0.2.10:33581", KNOWN_IP="192.0.2.10", KNOWN_IDENTITY="adb-example-device-")
        self.device_patch.start()
        self.addCleanup(self.device_patch.stop)

    def test_wrong_device_never_installs(self):
        calls = []
        def run(args, **kwargs):
            calls.append([str(x) for x in args])
            if args[-1] == 'get-state':
                return 'device'
            if args[-1] == 'ro.product.model':
                return 'Outra TV'
            if args[-1] == 'ro.board.platform':
                return 'other'
            return ''
        with patch.object(installer, 'adb_executable', return_value=Path('/example/adb')), patch.object(sys, 'argv', ['instalar_tv.py']), patch.object(installer, 'check_files'), patch.object(installer, 'command', side_effect=run), patch.object(installer, 'ensure_service') as service:
            with self.assertRaisesRegex(RuntimeError, 'não corresponde'):
                installer.main()
            service.assert_not_called()
        self.assertFalse(any('install' in args for args in calls))

    def test_other_server_is_not_stopped(self):
        responses = [{'service': 'Konka Glass'}, OSError('old API')]
        with patch.object(installer, 'request', side_effect=responses), patch.object(installer, 'command', side_effect=['456', 'python3 /other/project/server.py']), patch.object(installer.os, 'kill') as kill, patch.object(installer.subprocess, 'Popen') as start:
            with self.assertRaisesRegex(RuntimeError, 'origem do servidor'):
                installer.ensure_service('192.0.2.10:33581')
            kill.assert_not_called()
            start.assert_not_called()

    def test_current_service_is_reused_without_restart(self):
        with patch.object(installer, 'request', side_effect=[{'service': 'Konka Glass', 'tvDevice': '192.0.2.10:33581', 'catalogVersion': 2, 'ambientVersion': 1, 'performanceVersion': 1}, {'apiConfigured': True, 'deviceFlowVersion': 1}]), patch.object(installer, 'command') as command, patch.object(installer.subprocess, 'Popen') as start:
            installer.ensure_service('192.0.2.10:33581')
            command.assert_not_called()
            start.assert_not_called()

    def test_mdns_excludes_pairing_and_other_devices(self):
        data = 'adb-a _adb-tls-pairing._tcp 192.0.2.10:30000\nadb-a _adb-tls-connect._tcp. 192.0.2.10:40001\nadb-b _adb-tls-connect._tcp 192.0.2.20:40002\nadb-a _adb-tls-connect._tcp 192.0.2.10:40001'
        self.assertEqual(installer.mdns_candidates(data), ['192.0.2.10:40001'])

    def test_discovers_new_port_after_old_port_fails(self):
        def run(args, **kwargs):
            if args[-1] == 'get-state':
                if args[2].endswith(':40001'):
                    return 'device'
                raise RuntimeError('not found')
            if args[-2:] == ['devices', '-l']:
                return 'List of devices attached'
            if args[-2:] == ['mdns', 'services']:
                return 'adb-a _adb-tls-connect._tcp 192.0.2.10:40001'
            return ''
        with patch.object(installer, 'command', side_effect=run):
            self.assertEqual(installer.connect_tv('adb'), '192.0.2.10:40001')

    def test_explicit_address_does_not_switch_to_another_device(self):
        with patch.object(installer, 'command', side_effect=RuntimeError('not found')) as command:
            with self.assertRaisesRegex(RuntimeError, 'Endereço IP e porta'):
                installer.connect_tv('adb', '192.0.2.10:40003')
            self.assertFalse(any('mdns' in call.args[0] for call in command.call_args_list))

    def test_local_permission_failure_is_not_misreported_as_pairing_failure(self):
        for response in ['failed to connect: Operation not permitted', RuntimeError('Permission denied')]:
            kwargs = {'side_effect': response} if isinstance(response, Exception) else {'return_value': response}
            with self.subTest(response=type(response).__name__), patch.object(installer, 'command', **kwargs) as command:
                with self.assertRaisesRegex(installer.LocalADBPermissionError, 'bloqueada no Mac'):
                    installer.connect_tv('adb')
                self.assertEqual(command.call_count, 1)


if __name__ == '__main__':
    unittest.main()
