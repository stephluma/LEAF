import json

with open('leaf_secure_sites.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

extracted_keys = []

for key in data:
    extracted_keys.append(key)

for key in extracted_keys:
    print(key)

with open('extracted_keys.txt', 'w', encoding='utf-8') as out_file:
    for key in extracted_keys:
        out_file.write(key + '\n')
