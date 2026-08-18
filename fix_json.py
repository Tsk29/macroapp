import re

with open("nodes.py", "r") as f:
    content = f.read()

# Make sure it uses openai/gpt-oss-120b
content = content.replace('model="qwen/qwen3.6-27b"', 'model="openai/gpt-oss-120b"')

# Fix JSON parsing block to be robust
robust_parsing = """
        output = response.choices[0].message.content.strip()
        import re
        match = re.search(r'\\{.*\\}', output, re.DOTALL)
        if match:
            output = match.group(0)
        return json.loads(output)
"""

# Replace the existing output parsing block
# It currently looks like:
# output = response.choices[0].message.content.strip()
#         if output.startswith("```"):
#             import re
#             output = re.sub(r"^```(?:json)?\s*", "", output)
#             output = re.sub(r"\s*```$", "", output)
#         return json.loads(output)

content = re.sub(
    r"output = response\.choices\[0\]\.message\.content\.strip\(\).*?return json\.loads\(output\)",
    robust_parsing.strip(),
    content,
    flags=re.DOTALL
)

with open("nodes.py", "w") as f:
    f.write(content)
