import asyncio
import httpx
import random
import time

BASE_URL = "https://neuroshield-ai-app.onrender.com"

async def simulate_user(user_id):
    async with httpx.AsyncClient() as client:
        print(f"User {user_id}: Starting test...")
        # 1. Check Health
        try:
            resp = await client.get(f"{BASE_URL}/health")
            print(f"User {user_id}: Health Check -> {resp.status_code}")
        except Exception as e:
            print(f"User {user_id}: Connection Failed")
            return

        # 2. Simulate Transaction Check (Anonymous)
        payload = {
            "amount": random.uniform(10.0, 5000.0),
            "merchant": f"Merchant_{random.randint(1,100)}",
            "category": random.choice(["Food", "Shopping", "Tech", "Travel"]),
            "location": "New York, NY",
            "device_model": "iPhone Simulation",
            "os_version": "iOS 17.0"
        }
        
        start_time = time.time()
        resp = await client.post(f"{BASE_URL}/transactions/check", json=payload)
        end_time = time.time()
        
        if resp.status_code == 200:
            result = resp.json()
            print(f"User {user_id}: TX Processed in {int((end_time - start_time)*1000)}ms. Risk Score: {result.get('risk_score')}")
        else:
            print(f"User {user_id}: Error {resp.status_code}")

async def main():
    print("--- STARTING EXTERNAL USER SIMULATION ---")
    tasks = [simulate_user(i) for i in range(1, 6)]
    await asyncio.gather(*tasks)
    print("--- SIMULATION COMPLETED ---")

if __name__ == "__main__":
    asyncio.run(main())
