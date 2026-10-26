from flask import Flask, jsonify
from groq import Groq
import requests
import xml.etree.ElementTree as ET
import json
import os
import time
import datetime
import traceback

app = Flask(__name__)

api_key = os.environ.get("GROQ_API_KEY", "").strip()
groq = Groq(api_key=api_key)

MODEL = "openai/gpt-oss-120b"
NEWS_URL = "https://news.google.com/rss/search?q=scam+fraud+deepfake+older+adults+when:14d&hl=en-US&gl=US&ceid=US:en"

cache = {"time": 0, "data": None}
CACHE_SECONDS = 6 * 3600

@app.after_request
def allow_page(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


def get_headlines():
    reply = requests.get(NEWS_URL, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
    reply.raise_for_status()
    items = ET.fromstring(reply.content).findall("./channel/item")[:10]

    headlines = []
    for item in items:
        title = item.findtext("title", "")
        outlet = item.findtext("source") or ""
        if outlet:
            title = title.replace(" - " + outlet, "")
        headlines.append({"title": title, "outlet": outlet, "link": item.findtext("link")})
    return headlines


def get_news():
    if cache["data"] and time.time() - cache["time"] < CACHE_SECONDS:
        return cache["data"]

    headlines = get_headlines()
    if not headlines:
        raise ValueError("the news feed was empty")

    numbered = ""
    for i, h in enumerate(headlines):
        numbered += str(i + 1) + ". " + h["title"] + " (" + h["outlet"] + ")\n"

    prompt = (
        "Here are recent news headlines:\n\n" + numbered + "\n"
        "Pick the 4 that matter most for everyday people and older adults trying to avoid scams. "
        "For each one, rewrite the headline in short plain words and add one simple sentence about "
        "what it means for a regular person. Only use what the headline says, don't add any facts. "
        'Reply with ONLY JSON like this: {"stories": [{"number": 1, "headline": "short headline", '
        '"summary": "one plain sentence"}]}. The number is the number from the list above.'
    )

    reply = groq.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}]
    )

    # the model sometimes adds extra words around the json, so grab just the { } part
    text = reply.choices[0].message.content or ""
    picked = json.loads(text[text.find("{"):text.rfind("}") + 1])["stories"]

    stories = []
    sources = []
    for story in picked[:4]:
        stories.append({"headline": story["headline"], "summary": story["summary"]})
        n = int(story.get("number", 0)) - 1
        if 0 <= n < len(headlines):
            h = headlines[n]
            sources.append({"title": h["outlet"] + ": " + h["title"], "url": h["link"]})

    data = {
        "stories": stories,
        "sources": sources,
        "updated": datetime.datetime.now().strftime("%b %d, %I:%M %p")
    }
    cache["data"] = data
    cache["time"] = time.time()
    return data


@app.route("/news")
def news():
    try:
        return jsonify(get_news())
    except Exception as error:
        traceback.print_exc()
        print("News failed:", error)
        if cache["data"]:
            return jsonify(cache["data"])
        return jsonify({"error": "Couldn't load the news", "detail": str(error)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
