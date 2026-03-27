/* ===================================================
   Notes / To-Do Module
   =================================================== */

let notes = [];
let currentFilter = 'all';

function loadNotes() {
  try {
    const saved = localStorage.getItem('sanskriti_notes');
    if (saved) {
      notes = JSON.parse(saved);
    }
  } catch (e) {
    notes = [];
  }
  renderNotes();
}

function saveNotes() {
  try {
    localStorage.setItem('sanskriti_notes', JSON.stringify(notes));
  } catch (e) {
    console.warn('Could not save notes to localStorage');
  }
}

function addNote() {
  const input = document.getElementById('noteInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  notes.unshift({
    id: Date.now(),
    text: text,
    done: false,
    created: new Date().toISOString()
  });

  input.value = '';
  saveNotes();
  renderNotes();
}

function addNoteFromVoice(text) {
  notes.unshift({
    id: Date.now(),
    text: text,
    done: false,
    created: new Date().toISOString()
  });
  saveNotes();
  renderNotes();
}

function toggleNote(id) {
  const note = notes.find(n => n.id === id);
  if (note) {
    note.done = !note.done;
    saveNotes();
    renderNotes();
  }
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  saveNotes();
  renderNotes();
}

function filterNotes(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderNotes();
}

function renderNotes() {
  const list = document.getElementById('notesList');
  const empty = document.getElementById('notesEmpty');
  if (!list) return;

  let filtered = notes;
  if (currentFilter === 'active') filtered = notes.filter(n => !n.done);
  if (currentFilter === 'done') filtered = notes.filter(n => n.done);

  if (filtered.length === 0) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  list.innerHTML = filtered.map(note => `
    <div class="note-item ${note.done ? 'done' : ''}" data-id="${note.id}">
      <div class="note-checkbox" onclick="toggleNote(${note.id})"></div>
      <span class="note-text">${escapeHTML(note.text)}</span>
      <button class="note-delete" onclick="deleteNote(${note.id})" title="Delete">🗑️</button>
    </div>
  `).join('');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Handle Enter key
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('noteInput');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addNote();
      }
    });
  }
});
