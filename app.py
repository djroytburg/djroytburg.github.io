from flask import Flask, render_template, url_for

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/publications')
def publications():
    return render_template('page.html', title='Publications',
                           body="""A list of publications will go here. Link to PDFs or external pages as desired.""")


@app.route('/cv')
def cv():
    return render_template('page.html', title='Curriculum Vitae',
                           body="""Link to your CV (PDF) or provide a short biography and a download link.""")


@app.route('/research')
def research():
    return render_template('page.html', title='Research',
                           body="""Describe your research interests and link to a fuller research page.""")


@app.route('/blog')
def blog():
    return render_template('page.html', title='Blog',
                           body="""Your personal blog index can be linked or embedded here.""")


if __name__ == '__main__':
    app.run(debug=True)
