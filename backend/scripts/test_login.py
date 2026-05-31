import asyncio
import os
from supabase import create_client

URL = "https://afbhslcmicnqhpgboxlh.supabase.co"
KEY = "sb_publishable_GMmSf2NpiGTD0eykVZf4XA_vm3k0Shk"  # Use anon key to test login

async def main():
    try:
        supabase = create_client(URL, KEY)
        # Sign in
        res = supabase.auth.sign_in_with_password({
            "email": "shuklaabhinav824@gmail.com",
            "password": "$huklaAbhinav12345"
        })
        token = res.session.access_token
        print("Got token:", token[:10] + "...")
        
        # Test Render API
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://coral-flow-api.onrender.com/agents/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            print("Render status:", resp.status_code)
            print("Render response:", resp.text)
            
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
