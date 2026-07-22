import urllib.request, json, time, re
from collections import Counter

APP_ID = "6740075665"
COUNTRIES = ["ph","id","my","th","vn","sg","tw","br","mx","co","cl"]  # SPX markets
PAGES = range(1, 11)  # ~50 reviews/page, up to 10 pages/country

def fetch(country, page):
    url = f"https://itunes.apple.com/{country}/rss/customerreviews/page={page}/id={APP_ID}/sortBy=mostRecent/json"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        data = json.load(urllib.request.urlopen(req, timeout=30))
        return [e for e in data.get("feed", {}).get("entry", []) if "im:rating" in e]
    except Exception:
        return []

seen, rows = set(), []
for c in COUNTRIES:
    for p in PAGES:
        for e in fetch(c, p):
            rid = e["id"]["label"]
            if rid in seen:
                continue
            seen.add(rid)
            rows.append({
                "country": c,
                "rating": int(e["im:rating"]["label"]),
                "version": e.get("im:version", {}).get("label", ""),
                "title": e["title"]["label"],
                "body": e["content"]["label"],
            })
        time.sleep(0.3)  # be polite; avoid rate-limiting

print(f"Total unique reviews pulled: {len(rows)}")

# --- theme keyword sets (edit freely) ---
RIDER = ["rider","courier","driver","delivery man","delivery person","kuya",
         "rude rider","rider rude","attitude","rider didn","hindi dumating"]
FALSE_DELIV = ["failed delivery","false","fake","marked as delivered","never delivered",
               "not delivered","didn't deliver","did not deliver","no one came",
               "nobody came","without attempting","never came","unsuccessful",
               "hindi naghatid","hindi dumating","daw","claimed delivered"]

def hit(text, kws): 
    t = text.lower()
    return any(k in t for k in kws)

neg = [r for r in rows if r["rating"] <= 2]
print(f"Negative (1-2 star): {len(neg)}  ({len(neg)/max(len(rows),1)*100:.1f}% of all)")

# rating distribution
print("\nRating distribution:", dict(sorted(Counter(r['rating'] for r in rows).items())))

# theme counts within negatives
rider_neg = [r for r in neg if hit(r["title"]+" "+r["body"], RIDER)]
false_neg = [r for r in neg if hit(r["title"]+" "+r["body"], FALSE_DELIV)]
both      = [r for r in neg if r in rider_neg and r in false_neg]

print(f"\nNegative reviews mentioning RIDER problems:  {len(rider_neg)} "
      f"({len(rider_neg)/max(len(neg),1)*100:.1f}% of negatives)")
print(f"Negative reviews mentioning FALSE/FAILED delivery: {len(false_neg)} "
      f"({len(false_neg)/max(len(neg),1)*100:.1f}% of negatives)")
print(f"Reviews hitting BOTH themes: {len(both)}")

# a few short example snippets (keep quotes short if you republish)
print("\n--- sample false-delivery snippets ---")
for r in false_neg[:8]:
    print(f"[{r['country']} {r['rating']}*] {r['body'][:120].strip()}")

# save for your slide/charts
import csv
with open("spx_reviews.csv","w",newline="",encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["country","rating","version","title","body"])
    w.writeheader(); w.writerows(rows)
print("\nSaved spx_reviews.csv")