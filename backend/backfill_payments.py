import sqlite3, uuid, datetime

db = sqlite3.connect('adventurers.db')

# Check existing payment records
existing = db.execute("SELECT ChildId FROM Payments WHERE Type='Registration'").fetchall()
existing_child_ids = {r[0] for r in existing}
print("Existing registration payments for child IDs:", existing_child_ids)

# Get paid children with no registration payment
children = db.execute("SELECT Id, Name, ParentId FROM Children WHERE Status='Paid'").fetchall()
now = datetime.datetime.utcnow().isoformat()

for child_id, child_name, parent_id in children:
    if child_id in existing_child_ids:
        print(f"Skipping {child_name} - already has payment record")
        continue
    receipt_code = "BAC-" + uuid.uuid4().hex[:12].upper()
    ref = f"REG-{child_id}-{datetime.datetime.utcnow().strftime('%Y%m%d')}"
    db.execute(
        "INSERT INTO Payments (UserId, ChildId, Amount, Type, Status, Reference, ReceiptCode, Notes, IsAnonymous, CreatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (parent_id, child_id, 150.0, 'Registration', 'Completed', ref, receipt_code, f'Registration fee for {child_name}', 0, now)
    )
    print(f"Created payment for {child_name} (id={child_id}), receipt={receipt_code}")

db.commit()
print("Done.")
db.close()
