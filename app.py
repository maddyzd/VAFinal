from flask import Flask, render_template, request, jsonify
from collections import Counter
import os
import re
import csv

app = Flask(__name__, static_folder='static', template_folder='templates')

SOURCE_DIR = 'sources'


def get_source_folders():
    folders = [f for f in os.listdir(SOURCE_DIR) if os.path.isdir(os.path.join(SOURCE_DIR, f))]
    if 'email_headers.csv' in os.listdir(SOURCE_DIR):
        folders.append('email_headers.csv')
    return folders

def load_documents_by_folders(selected_folders):
    text = ""
    for folder in selected_folders:
        if folder == 'email_headers.csv':
            csv_path = os.path.join(SOURCE_DIR, 'email_headers.csv')
            try:
                with open(csv_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        subject = row.get('Subject', '')
                        body = row.get('Body', '') or row.get('Content', '')
                        text += f"{subject} {body} ".lower()
            except UnicodeDecodeError:
                with open(csv_path, 'r', encoding='latin-1') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        subject = row.get('Subject', '')
                        body = row.get('Body', '') or row.get('Content', '')
                        text += f"{subject} {body} ".lower()
        else:
            folder_path = os.path.join(SOURCE_DIR, folder)
            for root, _, files in os.walk(folder_path):
                for file in files:
                    if file.endswith('.txt'):
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                text += f.read().lower() + " "
                        except UnicodeDecodeError:
                            with open(file_path, 'r', encoding='latin-1') as f:
                                text += f.read().lower() + " "
    return text


def clean_text(text):
    text = re.sub(r'[^\w\s]', '', text)
    words = text.split()
    stopwords = {'the', 'and', 'of', 'in', 'to', 'a', 'for', 'on', 'is', 'with', 'as', 'by', 'an', 'at'}
    return [w for w in words if w not in stopwords and len(w) > 2]

# Routes for Static Pages 

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/timeline')
def timeline():
    return render_template('timeline.html')

@app.route('/graph')
def graph():
    return render_template('graph.html')

@app.route('/people')
def people():
    return render_template('people.html')

@app.route('/organizations')
def organizations():
    return render_template('organizations.html')

@app.route('/llm')
def llm():
    return render_template('llm.html')

@app.route('/bias')
def bias():
    return render_template('bias.html')


@app.route('/words')
def words_page():
    folders = get_source_folders()
    return render_template('words.html', folders=folders)

@app.route('/wordcloud', methods=['POST'])
def wordcloud():
    selected = request.json.get('folders', [])
    raw_text = load_documents_by_folders(selected)
    words = clean_text(raw_text)
    freqs = Counter(words).most_common(100)
    return jsonify(freqs)

# --- Start the App ---

if __name__ == '__main__':
    app.run(debug=True)
