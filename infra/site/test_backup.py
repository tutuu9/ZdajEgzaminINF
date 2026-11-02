"""Exercise backup failure and retention boundaries without a database or Docker."""

import contextlib
import hashlib
import io
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

# The deployment runs on Linux. Allow retention tests on the Windows developer
# machine while mocking the Linux lock call explicitly in every test.
try:
    import fcntl  # noqa: F401
except ModuleNotFoundError:
    sys.modules["fcntl"] = types.SimpleNamespace(LOCK_EX=2, LOCK_NB=4, flock=None)

import backup


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.workspace = tempfile.TemporaryDirectory()
        self.addCleanup(self.workspace.cleanup)
        self.root = Path(self.workspace.name).resolve()
        self.archives = self.root / "backups"
        self.archives.mkdir()
        self.stack = contextlib.ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(backup, "DEPLOYMENT", self.root))
        self.stack.enter_context(patch.object(backup, "BACKUPS", self.archives))
        self.stack.enter_context(patch.object(backup, "LOCK_FILE", self.root / "backup.lock"))
        self.stack.enter_context(patch.object(backup.os, "geteuid", return_value=0, create=True))
        self.lock = self.stack.enter_context(patch.object(backup.fcntl, "flock"))
        self.stack.enter_context(contextlib.redirect_stdout(io.StringIO()))

    def old_archives(self):
        for day in range(1, 8):
            archive = self.archives / f"zdaj-200001{day:02d}T000000Z.dump"
            archive.write_bytes(b"previous verified backup")
            archive.with_suffix(".dump.sha256").write_text("previous checksum")

    @staticmethod
    def successful_database_command(arguments, **streams):
        if arguments[0] == "pg_dump":
            streams["stdout"].write(b"verified test dump")
        else:
            if streams["stdin"].read() != b"verified test dump":
                raise RuntimeError("Unexpected archive content")

    def test_success_keeps_seven_archives_and_unrelated_files(self):
        self.old_archives()
        unrelated = self.archives / "owner-notes.txt"
        unrelated.write_text("keep")
        with patch.object(
            backup, "run_database_command", side_effect=self.successful_database_command
        ):
            backup.backup()
        archives = sorted(self.archives.glob("*.dump"))
        self.assertEqual(len(archives), 7)
        self.assertFalse((self.archives / "zdaj-20000101T000000Z.dump").exists())
        self.assertFalse((self.archives / "zdaj-20000101T000000Z.dump.sha256").exists())
        self.assertEqual(unrelated.read_text(), "keep")
        latest = archives[-1]
        digest = hashlib.sha256(latest.read_bytes()).hexdigest()
        self.assertEqual(
            latest.with_suffix(".dump.sha256").read_text(), f"{digest}  {latest.name}\n"
        )

    def test_dump_failure_preserves_previous_backups_and_removes_partial_file(self):
        self.old_archives()
        previous = set(self.archives.iterdir())

        def failure(_arguments, **streams):
            streams["stdout"].write(b"partial data")
            raise RuntimeError("Database unavailable")

        with patch.object(backup, "run_database_command", side_effect=failure):
            with self.assertRaises(RuntimeError):
                backup.backup()
        self.assertEqual(set(self.archives.iterdir()), previous)

    def test_invalid_archive_does_not_replace_or_prune_previous_backups(self):
        self.old_archives()
        previous = set(self.archives.iterdir())

        def failure(arguments, **streams):
            if arguments[0] == "pg_dump":
                streams["stdout"].write(b"invalid archive")
            else:
                raise RuntimeError("Invalid archive")

        with patch.object(backup, "run_database_command", side_effect=failure):
            with self.assertRaises(RuntimeError):
                backup.backup()
        self.assertEqual(set(self.archives.iterdir()), previous)

    def test_concurrent_backup_does_not_start_another_dump(self):
        self.lock.side_effect = BlockingIOError
        with patch.object(backup, "run_database_command") as database:
            backup.backup()
            database.assert_not_called()
        self.assertEqual(list(self.archives.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
