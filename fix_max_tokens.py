import re

with open("nodes.py", "r") as f:
    content = f.read()

# Add max_tokens=8000 to all gpt-oss-120b calls
content = re.sub(
    r'model="openai/gpt-oss-120b",',
    r'model="openai/gpt-oss-120b",\n            max_completion_tokens=4000,',
    content
)

with open("nodes.py", "w") as f:
    f.write(content)
