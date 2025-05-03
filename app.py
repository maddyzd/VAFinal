from flask import Flask, render_template, request, jsonify
from collections import Counter
import os
import re
import csv
from pathlib import Path
from haystack.components.builders.prompt_builder import PromptBuilder
from haystack_integrations.components.generators.google_ai import GoogleAIGeminiGenerator
from haystack import Pipeline
from dotenv import load_dotenv

load_dotenv()



app = Flask(__name__, static_folder='static', template_folder='templates')

SOURCE_DIR = 'sources'
RAG_gen_template = """
Given the following contexts, answer the question to the best of your ability.
Context: 

    {{ all_context }}

Question: {{ query }}?
"""



def get_source_folders():
    folders = [f for f in os.listdir(SOURCE_DIR) if os.path.isdir(os.path.join(SOURCE_DIR, f))]
    if 'email_headers.csv' in os.listdir(SOURCE_DIR):
        folders.append('email_headers.csv')
    return folders


FOLDERS = get_source_folders()

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
    return render_template('llm.html', folders=FOLDERS)


@app.route('/words')
def words_page():
    return render_template('words.html', folders=FOLDERS)

@app.route('/wordcloud', methods=['POST'])
def wordcloud():
    selected = request.json.get('folders', [])
    raw_text = load_documents_by_folders(selected)
    words = clean_text(raw_text)
    freqs = Counter(words).most_common(int(request.json.get('words', 50)))
    return jsonify(freqs)


def get_all_content(path):
    path = Path(path)
    all_contents = ""
    # If the path is a dir, recursively call get_all content on it
    if path.is_dir():
        for sub_path in path.iterdir():
            all_contents += get_all_content(sub_path)
    # Otherwise, the path is a file, so read it and add its contents
    else:
        print(path)
        with open(path, 'r', errors='ignore') as f:
            all_contents = f.read()
    
    return all_contents
            


@app.route('/llm_query', methods=['POST'])
def llm_query():
    user_query = request.json.get('query', "")
    selected_folders = request.json.get('folders', [])
    folder_content = {}
    for folder in selected_folders:
        folder_content[folder] = get_all_content(os.path.join(SOURCE_DIR, folder))
        print(f"For folder: {folder}, the first 100 chars of content are:")
        print(folder_content[folder][:100])
        print("and the last 100 chars of content are:")
        print(folder_content[folder][-100:])

    all_context = ""
    for folder in selected_folders:
        all_context += f"Source: {folder}\n\n Content: {folder_content[folder]}\n\n"

    answer_prompt_builder = PromptBuilder(template=RAG_gen_template, required_variables={"all_context", "query"})
    answer_generator = GoogleAIGeminiGenerator(model="gemini-2.0-flash-lite")

    answer_pipeline = Pipeline()


    answer_pipeline.add_component("answer_builder", answer_prompt_builder) 
    answer_pipeline.add_component("llm_answer_generator", answer_generator) 

    answer_pipeline.connect("answer_builder", "llm_answer_generator")
    answer_results = answer_pipeline.run(
        data={
            "answer_builder":{
                "all_context": all_context,
                "query": user_query
            }
        }
    )
    answer = str(answer_results['llm_answer_generator']['replies'][0])
    # supporting_titles = '\n'.join([document.meta['title'] for document in retrieval_results['document_retriever']['documents']])

    print(answer)
    
    return jsonify(answer)

# --- Start the App ---

if __name__ == '__main__':
    app.run(debug=True)
