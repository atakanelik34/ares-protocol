# ARES Python SDK

```python
from ares_sdk import AresClient

client = AresClient("http://localhost:3001")
score = client.get_score("0xabc...")
print(score.ari)
```
