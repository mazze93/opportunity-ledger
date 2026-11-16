#!/usr/bin/env python3
"""Reproduce the evidence-adequacy boundary in one historical Stratum reference.

Usage: python3 scripts/probe-stratum-evidence.py /path/to/stratum \
           --evidence-dir /path/to/retained-probe-artifacts

Stdlib only; no network or live service calls. Refuses a reference file whose
Git blob SHA differs from the pinned source. Creates a unique fixture directory
and JSON receipt without deleting previous evidence. Exit 0: documented boundary
reproduced; exit 1: observation differs; exit 2: setup error. This is a newly
reconstructed probe, not the unavailable original October probe. It says nothing
about current Stratum, deployed controls, or semantic adequacy in general.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
from datetime import datetime, timezone
from uuid import uuid4

COMMIT = "2db1d965a6d64fdce80d4892173741a4c14896f0"
BLOB = "365cd2b830684017e0e656aa6aec5fe1cbc3d2d6"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stratum", type=Path)
    parser.add_argument("--evidence-dir", type=Path, required=True)
    args = parser.parse_args()
    source = args.stratum.resolve() / "reference" / "tessera_projection.py"
    data = source.read_bytes()
    blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    if blob != BLOB:
        raise ValueError(f"reference blob {blob} differs from pinned {BLOB}")
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location("stratum_historical_reference", source)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)

    root = args.evidence_dir.resolve() / ("probe-" + uuid4().hex)
    root.mkdir(parents=True, exist_ok=False)
    present = root / "fixture.txt"
    present.write_text("actual fixture contents\n", encoding="utf-8")
    actual_hash = hashlib.sha256(present.read_bytes()).hexdigest()
    good_ref = present.as_uri() + "#sha256=" + actual_hash
    cases = [
        ("unchecked_control", good_ref, None, False),
        ("checked_control", good_ref, "2026-11-15T00:00:00Z", True),
        ("nonexistent_reference", (root / "missing.txt").as_uri(), "2026-11-15T00:00:00Z", True),
        ("stale_check", good_ref, "1900-01-01T00:00:00Z", True),
        ("mismatched_digest", present.as_uri() + "#sha256=" + "0" * 64, "2026-11-15T00:00:00Z", True),
    ]
    results = []
    for name, ref, checked_at, expected in cases:
        log = module.EpisodicLog()
        log.append(module.Event(id="d", type="decision", agent_id="probe", schema_version=1,
                                birth_status=module.Status.PENDING_EVIDENCE))
        accepted, error = True, None
        try:
            log.append(module.Event(id="v", type="verification", agent_id="probe", schema_version=1,
                                    targets=("d",), evidence=(module.Evidence("file_hash", ref, checked_at),)))
        except module.ContractViolation as exc:
            accepted, error = False, str(exc)
        status = log.status_at("d", log.head)
        expected_status = module.Status.VALIDATED if accepted else module.Status.PENDING_EVIDENCE
        matches = accepted == expected and status is expected_status
        results.append({"case": name, "ref": ref, "checked_at": checked_at,
                        "accepted": accepted, "status": status.value, "error": error,
                        "expected_accepted": expected, "matches_expected": matches})
    receipt = {"observed_at": datetime.now(timezone.utc).isoformat(),
               "source_commit": COMMIT, "source_blob": blob,
               "reference_sha256": hashlib.sha256(data).hexdigest(),
               "probe_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               "python": sys.version, "scope": "historical reference only",
               "boundary_reproduced": all(r["matches_expected"] for r in results),
               "cases": results}
    (root / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"receipt": str(root / "receipt.json"), **receipt}, indent=2))
    return 0 if receipt["boundary_reproduced"] else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, ImportError) as exc:
        print(f"probe setup failed: {exc}", file=sys.stderr)
        raise SystemExit(2)
