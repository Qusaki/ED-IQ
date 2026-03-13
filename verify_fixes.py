
import requests

def test_headers():
    url = "http://localhost:8000/health"
    try:
        response = requests.get(url)
        print(f"Status: {response.status_code}")
        print("Headers:")
        for k, v in response.headers.items():
            print(f"  {k}: {v}")
        
        # Verify Cache-Control is NOT present (since I removed it)
        if "Cache-Control" in response.headers:
            print("FAILED: Cache-Control header still present!")
        else:
            print("SUCCESS: Cache-Control header removed.")
            
        # Verify CORS headers
        if "Access-Control-Allow-Origin" in response.headers:
            print(f"SUCCESS: CORS Origin: {response.headers['Access-Control-Allow-Origin']}")
        else:
            print("FAILED: CORS headers missing!")
            
    except Exception as e:
        print(f"Error: {e}")

def test_chatbot():
    url = "http://localhost:8000/chat/handbook"
    payload = {"message": "hello"}
    try:
        response = requests.post(url, json=payload)
        print(f"Chatbot Status: {response.status_code}")
        print(f"Chatbot Response: {response.json()}")
        if response.status_code == 200:
            print("SUCCESS: Chatbot endpoint accepted JSON body.")
        else:
            print("FAILED: Chatbot endpoint error.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Starting verification (assuming backend is running on localhost:8000)...")
    test_headers()
    test_chatbot()
