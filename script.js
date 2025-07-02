document.getElementById('runBtn').addEventListener('click', async () => {
  const brand = document.getElementById('brand').value;
  const fileInput = document.getElementById('fileInput');
  const output = document.getElementById('output');

  if (!fileInput.files.length) {
    output.textContent = 'Please select a PDF file.';
    return;
  }

  const formData = new FormData();
  formData.append('brand', brand);
  formData.append('file', fileInput.files[0]);

  output.textContent = 'Running analysis...';

  try {
    const res = await fetch('/netlify/functions/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Request failed');
    }

    const text = await res.text();
    output.textContent = text;
  } catch (err) {
    output.textContent = 'Error: ' + err.message;
  }
});
