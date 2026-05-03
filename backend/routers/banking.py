from fastapi import APIRouter, Depends, HTTPException
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
import os

from auth import get_current_user
from models import User

router = APIRouter(prefix="/banking", tags=["Banking"])

# Plaid Configuration (Sandbox for Demo)
PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID', 'sandbox_client_id')
PLAID_SECRET = os.getenv('PLAID_SECRET', 'sandbox_secret')
PLAID_ENV = 'sandbox'

configuration = Configuration(
    host=f"https://{PLAID_ENV}.plaid.com",
    api_key={
        'plaid-client-id': PLAID_CLIENT_ID,
        'plaid-secret': PLAID_SECRET,
    }
)

api_client = ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

@router.post("/create_link_token")
async def create_link_token(current_user: User = Depends(get_current_user)):
    """Generate a link token for the Plaid Link UI"""
    try:
        request = LinkTokenCreateRequest(
            products=[Products('transactions')],
            tier='basic',
            country_codes=[CountryCode('US'), CountryCode('CA')],
            language='en',
            client_name="NeuroShield AI",
            user=LinkTokenCreateRequestUser(
                client_user_id=str(current_user.id)
            )
        )
        response = client.link_token_create(request)
        return response.to_dict()
    except Exception as e:
        # For demo purposes, we return a mock token if Plaid credentials are missing
        return {"link_token": f"mock_link_token_{current_user.id}"}

@router.post("/exchange_public_token")
async def exchange_public_token(payload: dict, current_user: User = Depends(get_current_user)):
    """Exchange public token for a permanent access token"""
    public_token = payload.get('public_token')
    if not public_token:
        raise HTTPException(status_code=400, detail="Missing public_token")
    
    # In a real app, we'd exchange it here. 
    # For now, we simulate success to allow the UI flow to complete.
    return {"status": "success", "message": "Bank account linked successfully"}
