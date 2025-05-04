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

Question: {{ query }}
"""

answer_prompt_builder = PromptBuilder(template=RAG_gen_template, required_variables={"all_context", "query"})
answer_generator = GoogleAIGeminiGenerator(model="gemini-2.0-flash-lite")

answer_pipeline = Pipeline()


answer_pipeline.add_component("answer_builder", answer_prompt_builder) 
answer_pipeline.add_component("llm_answer_generator", answer_generator) 

answer_pipeline.connect("answer_builder", "llm_answer_generator")


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

nodes = [
    #Organizations
    {"id": "Protectors of Kronos (POK)", "group": "POK"},
    {"id": "GAStech International", "group": "GAStech"},
    {"id": "Kronos Government", "group": "Government"},
    {"id": "Abila Police", "group": "Government"},
    {"id": "Tethyn Federal Law Enforcement", "group": "Government"},
    {"id": "Tethyn Ministry of Foreign Affairs", "group": "Government"},
    {"id": "Abila Fire Department", "group": "Government"},

    # POK people
    {"id": "Juliana Vann", "group": "POK"},
    {"id": "Edvard Vann", "group": "GAStech"},
    {"id": "Henk Bodrogi", "group": "POK"},
    {"id": "Elian Karel", "group": "POK"},
    {"id": "Silvia Marek", "group": "POK"},

    # Government people
    {"id": "Cesare Nespola", "group": "Government"},
    {"id": "President Dorel Kapelou II", "group": "Government"},
    {"id": "Rufus Drymiau", "group": "Government"},
    {"id": "Vincent Kapelou", "group": "Government"},


    # Media people
    {"id": "Petrus Gerhard", "group": "Media"},
    {"id": "Maha Salo", "group": "Media"},
    {"id": "Haneson Ngohebo", "group": "Media"},
    {"id": "Sara Tuno", "group": "Media"},

    # Experts
    {"id": "John Rathburn", "group": "Expert"},
    {"id": "Jon L.", "group": "Citizen"},

    # GAStech executives
    {"id": "Sten Sanjorge Jr", "group": "GAStech"},
    {"id": "Sten Sanjorge Sr", "group": "GAStech"},
    {"id": "Ingrid Barranco", "group": "GAStech"},
    {"id": "Ada Campo-Corrente", "group": "GAStech"},
    {"id": "Orhan Strum", "group": "GAStech"},
    {"id": "Willem Vasco-Pais", "group": "GAStech"},

    # Other GAStech employees (grouped IT/Security/Facilities/Engineering)
    {"id": "Felix Resumir", "group": "GAStech"},
    {"id": "Hideki Cocinaro", "group": "GAStech"},
    {"id": "Inga Ferro", "group": "GAStech"},
    {"id": "Varja Lagos", "group": "GAStech"},
    {"id": "Kanon Herrero", "group": "GAStech"},
    {"id": "Stenig Fusil", "group": "GAStech"},
    {"id": "Hennie Osvaldo", "group": "GAStech"},
    {"id": "Isia Vann", "group": "GAStech"},
    {"id": "Loreto Bodrogi", "group": "GAStech"},
    {"id": "Bertrand Ovan", "group": "GAStech"},
    {"id": "Emile Arpa", "group": "GAStech"},
    {"id": "Varro Awelon", "group": "GAStech"},
    {"id": "Dante Coginian", "group": "GAStech"},
    {"id": "Albina Hafon", "group": "GAStech"},
    {"id": "Benito Hawelon", "group": "GAStech"},
    {"id": "Claudio Hawelon", "group": "GAStech"},
    {"id": "Henk Mies", "group": "GAStech"},
    {"id": "Minke Mies", "group": "GAStech"},
    {"id": "Ruscella Mies Haber", "group": "GAStech"},
    {"id": "Valeria Morlun", "group": "GAStech"},
    {"id": "Adan Morlun", "group": "GAStech"},
    {"id": "Cecilia Morluniau", "group": "GAStech"},
    {"id": "Irene Nant", "group": "GAStech"},
    {"id": "Dylan Scozzese", "group": "GAStech"},
    {"id": "Mat Bramar", "group": "GAStech"},
    {"id": "Anda Ribera", "group": "GAStech"},
    {"id": "Rachel Pantanal", "group": "GAStech"},
    {"id": "Linda Lagos", "group": "GAStech"},
    {"id": "Carla Forluniau", "group": "GAStech"},
    {"id": "Cornelia Lais", "group": "GAStech"},
    {"id": "Lidelse Dedos", "group": "GAStech"},
    {"id": "Felix Balas", "group": "GAStech"},
    {"id": "Lars Azada", "group": "GAStech"},
    {"id": "Adra Nubarron", "group": "GAStech"},
    {"id": "Birgitta Frente", "group": "GAStech"},
    {"id": "Vira Frente", "group": "GAStech"},
    {"id": "Marin Onda", "group": "GAStech"},
    {"id": "Elsa Orilla", "group": "GAStech"},
    {"id": "Kare Orilla", "group": "GAStech"},
    {"id": "Axel Calzas", "group": "GAStech"},
    {"id": "Brand Tempestad", "group": "GAStech"},
    {"id": "Isande Borrasca", "group": "GAStech"},
    {"id": "Gustav Cazar", "group": "GAStech"},
    {"id": "Linnea Bergen", "group": "GAStech"},
    {"id": "Isak Baza", "group": "GAStech"},
    {"id": "Nils Calixto", "group": "GAStech"},
    {"id": "Sven Flecha", "group": "GAStech"},
    {"id": "Lucas Alcazar", "group": "GAStech"},
]

links = [
    # Family relationships
    {"source": "Edvard Vann", "target": "Juliana Vann", "relation": "Family name match"},
    {"source": "Isia Vann", "target": "Edvard Vann", "relation": "Same family name"},
    {"source": "Isia Vann", "target": "Juliana Vann", "relation": "Same family name"},
    {"source": "Henk Bodrogi", "target": "Loreto Bodrogi", "relation": "Same family name"},
    {"source": "Linda Lagos", "target": "Varja Lagos", "relation": "Same family name"},
    {"source": "Henk Mies", "target": "Minke Mies", "relation": "Same family name"},
    {"source": "Henk Mies", "target": "Ruscella Mies Haber", "relation": "Same family name"},
    {"source": "Adan Morlun", "target": "Valeria Morlun", "relation": "Same family name"},
    {"source": "Adan Morlun", "target": "Cecilia Morluniau", "relation": "Same family name"},
    {"source": "Valeria Morlun", "target": "Cecilia Morluniau", "relation": "Same family name"},
    {"source": "Birgitta Frente", "target": "Vira Frente", "relation": "Same family name"},
    {"source": "Elsa Orilla", "target": "Kare Orilla", "relation": "Same family name"},
    {"source": "Nils Calixto", "target": "Lucas Alcazar", "relation": "Same last name grouping"},

    # Leadership transitions
    {"source": "Henk Bodrogi", "target": "Elian Karel", "relation": "Succeeded by"},
    {"source": "Elian Karel", "target": "Silvia Marek", "relation": "Succeeded by"},

    # Parent-child
    {"source": "Jeroen Karel", "target": "Elian Karel", "relation": "Father"},
    
    # Political family relationships
    {"source": "President Dorel Kapelou II", "target": "Vincent Kapelou", "relation": "Uncle"},
    {"source": "Vincent Kapelou", "target": "Cesare Nespola", "relation": "Successor"},
    
    # Public conflicts / tension
    {"source": "Protectors of Kronos (POK)", "target": "President Dorel Kapelou II", "relation": "Opposes"},
    {"source": "Protectors of Kronos (POK)", "target": "Vincent Kapelou", "relation": "Threatened"},
    {"source": "President Dorel Kapelou II", "target": "Protectors of Kronos (POK)", "relation": "Declared terrorist"},
    {"source": "Rufus Drymiau", "target": "Protectors of Kronos (POK)", "relation": "Declared terrorist"},
    {"source": "Adrien Carman", "target": "Protectors of Kronos (POK)", "relation": "Condemned protest violence"},
    {"source": "Officer Emilio Haber", "target": "Protectors of Kronos (POK)", "relation": "Police confrontation"},
    {"source": "Cesare Nespola", "target": "Henk Bodrogi", "relation": "Met regarding water contamination"},
    
    # Memorial and martyr status
    {"source": "Juliana Vann", "target": "Protectors of Kronos (POK)", "relation": "Martyr figure"},
    {"source": "Elian Karel", "target": "Protectors of Kronos (POK)", "relation": "Martyr figure"},

    # Government collaboration with GAStech
    {"source": "President Dorel Kapelou II", "target": "Sten Sanjorge Jr", "relation": "Attended events with"},
    {"source": "President Dorel Kapelou II", "target": "GAStech International", "relation": "Kleptocracy ties"},

    # Ministerial action
    {"source": "Cesare Nespola", "target": "Dr. Ronald Gerald", "relation": "Licensed oncologist"},

    # Media coverage
    {"source": "Haneson Ngohebo", "target": "Sten Sanjorge Jr", "relation": "Reported on"},
    {"source": "Sara Tuno", "target": "Sten Sanjorge Jr", "relation": "Reported on"},
    {"source": "Haneson Ngohebo", "target": "Edvard Vann", "relation": "Reported on"},
    {"source": "Haneson Ngohebo", "target": "President Dorel Kapelou II", "relation": "Reported on"},

    # Homeland Illumination
    {"source": "Petrus Gerhard", "target": "Maha Salo", "relation": "Colleague"},

    # Expert commentary
    {"source": "John Rathburn", "target": "Protectors of Kronos (POK)", "relation": "Assessed risk from"},

    # Government collaborations
    {"source": "Tethyn Federal Law Enforcement", "target": "Abila Police", "relation": "Assists"},
    {"source": "Tethyn Ministry of Foreign Affairs", "target": "Abila Police", "relation": "Assists"},

    # Miscellaneous citizen protest
    {"source": "Jon L.", "target": "Kronos Government", "relation": "Critical of"},
    {"source": "Jon L.", "target": "GAStech International", "relation": "Critical of"},

    # GAStech internal
    {"source": "Sten Sanjorge Jr", "target": "Sten Sanjorge Sr", "relation": "Son of"},
    {"source": "Ingrid Barranco", "target": "GAStech International", "relation": "CFO"},
    {"source": "Ada Campo-Corrente", "target": "GAStech International", "relation": "CIO"},
    {"source": "Orhan Strum", "target": "GAStech International", "relation": "COO"},
    {"source": "Willem Vasco-Pais", "target": "GAStech International", "relation": "Environmental Officer"},
]


@app.route('/people_data')
def people_data():
    return jsonify({"nodes": nodes, "links": links})


@app.route('/resume_text/<name>')
def resume_text(name):
    filename = f"Resume-{name}.txt"
    print(filename)
    path = os.path.join("sources", "resumetxt", filename)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return jsonify({"text": f.read()})
    return jsonify({"text": ""})




# --- Start the App ---

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)
