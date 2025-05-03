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


@app.route('/words')
def words_page():
    folders = get_source_folders()
    return render_template('words.html', folders=folders)

@app.route('/wordcloud', methods=['POST'])
def wordcloud():
    selected = request.json.get('folders', [])
    raw_text = load_documents_by_folders(selected)
    words = clean_text(raw_text)
    freqs = Counter(words).most_common(int(request.json.get('words', 50)))
    return jsonify(freqs)

nodes = [
    # Organizations
    {"id": "Protectors of Kronos (POK)", "group": "POK"},
    {"id": "GAStech International", "group": "GAStech"},
    {"id": "Kronos Government", "group": "Government"},
    {"id": "Abila Police", "group": "Government"},
    {"id": "Tethyn Federal Law Enforcement", "group": "Government"},
    {"id": "Tethyn Ministry of Foreign Affairs", "group": "Government"},
    {"id": "Abila Fire Department", "group": "Government"},
    {"id": "The Abila Post", "group": "Media"},
    {"id": "Homeland Illumination", "group": "Media"},

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
    {"id": "Sten Sanjorge Jr.", "group": "GAStech"},
    {"id": "Sten Sanjorge Sr.", "group": "GAStech"},
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
    {"source": "Edvard Vann", "target": "Juliana Vann", "relation": "Father"},
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
    {"source": "Henk Bodrogi", "target": "Elian Karel", "relation": "Leadership transfer"},
    {"source": "Elian Karel", "target": "Silvia Marek", "relation": "Leadership succession"},

    # POK group relations
    {"source": "Protectors of Kronos (POK)", "target": "GAStech International", "relation": "Protests against"},
    {"source": "Protectors of Kronos (POK)", "target": "Kronos Government", "relation": "Declared public threat"},
    {"source": "Protectors of Kronos (POK)", "target": "President Dorel Kapelou II", "relation": "Opposes"},
    {"source": "Protectors of Kronos (POK)", "target": "Vincent Kapelou", "relation": "Threatened"},

    # Media coverage
    {"source": "Haneson Ngohebo", "target": "Sten Sanjorge Jr.", "relation": "Reported on"},
    {"source": "Sara Tuno", "target": "Sten Sanjorge Jr.", "relation": "Reported on"},
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
    {"source": "Sten Sanjorge Jr.", "target": "Sten Sanjorge Sr.", "relation": "Son of"},
    {"source": "Ingrid Barranco", "target": "GAStech International", "relation": "CFO"},
    {"source": "Ada Campo-Corrente", "target": "GAStech International", "relation": "CIO"},
    {"source": "Orhan Strum", "target": "GAStech International", "relation": "COO"},
    {"source": "Willem Vasco-Pais", "target": "GAStech International", "relation": "Environmental Officer"},
]
# --- Start the App ---

if __name__ == '__main__':
    app.run(debug=True)
