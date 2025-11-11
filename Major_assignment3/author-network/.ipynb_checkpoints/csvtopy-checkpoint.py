import pandas as pd
import json
from itertools import combinations

# Step 1: Load your CSV
df = pd.read_csv("authors.csv")  # Replace with your CSV file name

# Step 2: Remove missing data
df = df.dropna(subset=['Author','Affiliation','Year'])

# Step 3: Create nodes
nodes = []
for idx, row in df.iterrows():
    nodes.append({
        "id": row['Author'],
        "affiliation": row['Affiliation'],
        "degree": 0  # will update later
    })

# Step 4: Create links (example: all authors connected if needed)
links = []
author_list = df['Author'].tolist()
for author1, author2 in combinations(author_list, 2):
    # Example: link all authors (adjust based on shared publications if you have that info)
    links.append({"source": author1, "target": author2, "weight": 1})

# Step 5: Update degree
for node in nodes:
    node['degree'] = sum(1 for link in links if link['source']==node['id'] or link['target']==node['id'])

# Step 6: Save as JSON
data = {"nodes": nodes, "links": links}
with open("data.json", "w") as f:
    json.dump(data, f, indent=2)

print("data.json created successfully!")
