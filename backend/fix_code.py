import sqlite3
db = sqlite3.connect('adventurers.db')
db.execute("UPDATE Children SET AdventurerCode='ADV-SUN-002' WHERE Name='Azaliah Emily Hedley'")
db.commit()
rows = db.execute("SELECT Id, Name, Class, AdventurerCode FROM Children ORDER BY Id").fetchall()
for r in rows:
    print(r)
db.close()
