import sys
import os
import time

# Create a small script that spins up the FastAPI app in a background thread or process
# and runs HTTP requests using urllib.request (so we don't need any additional packages).
import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000"

def make_request(path, method="GET", data=None, token=None, files=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    if files:
        # Multi-part form data parser for uploading files
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        body_parts = []
        for field_name, file_info in files.items():
            filename, file_content = file_info
            body_parts.append(f"--{boundary}")
            body_parts.append(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"')
            body_parts.append("Content-Type: text/plain")
            body_parts.append("")
            body_parts.append(file_content)
        body_parts.append(f"--{boundary}--")
        body_parts.append("")
        req_data = "\r\n".join(body_parts).encode("utf-8")
    elif data:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    else:
        req_data = None

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as res:
            res_content = res.read().decode("utf-8")
            if res.status == 204:
                return None
            return json.loads(res_content)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"HTTP Error {e.code}: {err_body}")
        raise e

def run_tests():
    print("--- Starting Backend Integration Tests ---")

    # 1. Sign up user
    username = f"user_{int(time.time())}"
    print(f"Signing up user: {username}...")
    signup_res = make_request("/api/auth/signup", method="POST", data={
        "username": username,
        "password": "testpassword123"
    })
    print("Signup Response:", signup_res)
    assert signup_res["username"] == username
    assert "aws_account_id" in signup_res

    # 2. Login
    print("Logging in...")
    login_res = make_request("/api/auth/login", method="POST", data={
        "username": username,
        "password": "testpassword123"
    })
    print("Login Response:", login_res)
    token = login_res["access_token"]
    assert token is not None

    # 3. Get profile
    print("Checking /me profile...")
    me_res = make_request("/api/auth/me", method="GET", token=token)
    print("Profile Response:", me_res)
    assert me_res["username"] == username

    # 4. Create hosted zone
    zone_name = f"testzone-{int(time.time())}.com."
    print(f"Creating hosted zone: {zone_name}...")
    zone_res = make_request("/api/zones", method="POST", token=token, data={
        "name": zone_name,
        "comment": "Testing api zone",
        "private_zone": False
    })
    print("Zone Response:", zone_res)
    zone_id = zone_res["id"]
    assert zone_res["name"] == zone_name
    assert zone_res["record_count"] == 2

    # 5. Check default records
    print(f"Fetching default records in zone: {zone_id}...")
    records_res = make_request(f"/api/zones/{zone_id}/records", method="GET", token=token)
    print("Records list:")
    for r in records_res:
        print(f" - {r['name']} {r['type']} {r['values']}")
    assert len(records_res) == 2
    types = [r["type"] for r in records_res]
    assert "NS" in types
    assert "SOA" in types

    # 6. Create A record
    print("Creating A record...")
    a_rec = make_request(f"/api/zones/{zone_id}/records", method="POST", token=token, data={
        "name": "www",
        "type": "A",
        "ttl": 300,
        "values": ["192.168.1.100", "192.168.1.101"]
    })
    print("Created record:", a_rec)
    assert a_rec["name"] == f"www.{zone_name}"
    assert a_rec["type"] == "A"
    assert len(a_rec["values"]) == 2

    # 7. Update A record
    record_id = a_rec["id"]
    print("Updating A record...")
    updated_rec = make_request(f"/api/zones/{zone_id}/records/{record_id}", method="PUT", token=token, data={
        "ttl": 600,
        "values": ["10.0.0.1"]
    })
    print("Updated record:", updated_rec)
    assert updated_rec["ttl"] == 600
    assert updated_rec["values"] == ["10.0.0.1"]

    # 8. Import BIND zone file
    bind_data = f"""$ORIGIN {zone_name}
$TTL 86400
db       IN  A     10.10.10.10
mail     3600 IN  MX    10 mailhost.{zone_name}
mailhost IN  A     10.10.10.11
"""
    print("Importing BIND zone file...")
    import_res = make_request(
        f"/api/zones/{zone_id}/records/import",
        method="POST",
        token=token,
        files={"file": ("test.zone", bind_data)}
    )
    print("Imported records:")
    for r in import_res:
        print(f" - {r['name']} {r['type']} {r['values']}")
    
    # Check if imports exist
    records_res2 = make_request(f"/api/zones/{zone_id}/records", method="GET", token=token)
    record_names = [r["name"] for r in records_res2]
    assert f"db.{zone_name}" in record_names
    assert f"mail.{zone_name}" in record_names

    # 9. Export BIND format
    print("Exporting zone in BIND format...")
    export_res = make_request(f"/api/zones/{zone_id}/records/export?format=bind", method="GET", token=token)
    print("Export Content:\n", export_res["bind_content"])
    assert "$ORIGIN" in export_res["bind_content"]
    assert "db" in export_res["bind_content"]

    # 9b. Verify AWS compatibility endpoints
    print("Testing AWS Route53 compatibility endpoints (/2013-04-01/hostedzone)...")
    aws_zones = make_request("/2013-04-01/hostedzone", method="GET", token=token)
    assert any(z["id"] == zone_id for z in aws_zones)

    aws_zone_details = make_request(f"/2013-04-01/hostedzone/{zone_id}", method="GET", token=token)
    assert aws_zone_details["name"] == zone_name

    aws_rrsets = make_request(f"/2013-04-01/hostedzone/{zone_id}/rrset", method="GET", token=token)
    assert len(aws_rrsets) > 0

    print("Creating record using AWS rrset endpoint...")
    aws_rec = make_request(
        f"/2013-04-01/hostedzone/{zone_id}/rrset",
        method="POST",
        token=token,
        data={
            "name": f"aws-compat.{zone_name}",
            "type": "TXT",
            "ttl": 3600,
            "values": ["compatibility-ok"]
        }
    )
    assert aws_rec["name"] == f"aws-compat.{zone_name}"

    # 10. Clean up (delete zone)
    print(f"Deleting hosted zone: {zone_id}...")
    make_request(f"/api/zones/{zone_id}", method="DELETE", token=token)
    
    # Verify zone is gone
    print("Verifying zone deletion...")
    all_zones = make_request("/api/zones", method="GET", token=token)
    zone_ids = [z["id"] for z in all_zones]
    assert zone_id not in zone_ids
    print("--- All tests passed successfully! ---")

if __name__ == "__main__":
    run_tests()
