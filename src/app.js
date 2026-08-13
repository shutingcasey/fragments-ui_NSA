import { signIn, getUser } from './auth';
import {
  getUserFragments,
  createFragment,
  updateFragment,
  deleteFragment,
  getFragmentData,
} from './api';
import logger from './logger';

const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]);

// The extensions each fragment type can be converted to, mirroring the
// fragments API's Valid Fragment Conversions table.
const CONVERSIONS = {
  'text/plain': ['txt'],
  'text/markdown': ['md', 'html', 'txt'],
  'text/html': ['html', 'txt'],
  'text/csv': ['csv', 'txt', 'json'],
  'application/json': ['json', 'yaml', 'txt'],
  'application/yaml': ['yaml', 'txt'],
  'image/png': ['png', 'jpg', 'webp', 'gif', 'avif'],
  'image/jpeg': ['png', 'jpg', 'webp', 'gif', 'avif'],
  'image/webp': ['png', 'jpg', 'webp', 'gif', 'avif'],
  'image/gif': ['png', 'jpg', 'webp', 'gif', 'avif'],
  'image/avif': ['png', 'jpg', 'webp', 'gif', 'avif'],
};

// Render a Blob returned by the API into a result container: images are
// shown as an <img>, everything else is treated as displayable text.
async function renderBlob(container, blob, contentType) {
  container.innerHTML = '';

  if (contentType && contentType.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    img.style.maxWidth = '100%';
    container.appendChild(img);
    return;
  }

  const pre = document.createElement('pre');
  pre.textContent = await blob.text();
  container.appendChild(pre);
}

function createFragmentCard(user, fragment, refresh) {
  const card = document.createElement('div');
  card.className = 'fragment-card';

  const info = document.createElement('div');
  info.innerHTML = `
    <hr />
    <p><strong>ID:</strong> ${fragment.id}</p>
    <p><strong>Type:</strong> ${fragment.type}</p>
    <p><strong>Size:</strong> ${fragment.size}</p>
    <p><strong>Created:</strong> ${fragment.created}</p>
    <p><strong>Updated:</strong> ${fragment.updated}</p>
  `;
  card.appendChild(info);

  const result = document.createElement('div');
  const editArea = document.createElement('div');
  editArea.hidden = true;

  // --- View ---
  const viewBtn = document.createElement('button');
  viewBtn.textContent = 'View';
  viewBtn.onclick = async () => {
    const { blob, contentType } = await getFragmentData(user, fragment.id);
    await renderBlob(result, blob, contentType);
  };

  // --- Convert to ---
  const extSelect = document.createElement('select');
  (CONVERSIONS[fragment.type] || []).forEach((ext) => {
    const option = document.createElement('option');
    option.value = ext;
    option.textContent = `.${ext}`;
    extSelect.appendChild(option);
  });

  const convertBtn = document.createElement('button');
  convertBtn.textContent = 'Convert';
  convertBtn.onclick = async () => {
    const { blob, contentType } = await getFragmentData(user, fragment.id, extSelect.value);
    await renderBlob(result, blob, contentType);
  };

  // --- Edit ---
  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.onclick = async () => {
    editArea.hidden = !editArea.hidden;
    if (editArea.hidden || editArea.dataset.loaded) {
      return;
    }
    editArea.innerHTML = '';

    if (IMAGE_TYPES.has(fragment.type)) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = fragment.type;

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.onclick = async () => {
        const file = fileInput.files[0];
        if (!file) {
          return;
        }
        await updateFragment(user, fragment.id, file, fragment.type);
        await refresh();
      };

      editArea.appendChild(fileInput);
      editArea.appendChild(saveBtn);
    } else {
      const { blob } = await getFragmentData(user, fragment.id);
      const textarea = document.createElement('textarea');
      textarea.rows = 6;
      textarea.style.width = '100%';
      textarea.value = await blob.text();

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.onclick = async () => {
        await updateFragment(user, fragment.id, textarea.value, fragment.type);
        await refresh();
      };

      editArea.appendChild(textarea);
      editArea.appendChild(document.createElement('br'));
      editArea.appendChild(saveBtn);
    }

    editArea.dataset.loaded = 'true';
  };

  // --- Delete ---
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.onclick = async () => {
    if (!confirm(`Delete fragment ${fragment.id}?`)) {
      return;
    }
    await deleteFragment(user, fragment.id);
    await refresh();
  };

  const actions = document.createElement('div');
  actions.appendChild(viewBtn);
  actions.appendChild(extSelect);
  actions.appendChild(convertBtn);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  card.appendChild(actions);
  card.appendChild(editArea);
  card.appendChild(result);

  return card;
}

async function displayFragments(user, data, refresh) {
  const fragmentsSection = document.querySelector('#fragments-section');
  const fragmentsList = document.querySelector('#fragments-list');

  fragmentsList.innerHTML = '';

  const fragments = data?.fragments || [];

  if (fragments.length === 0) {
    fragmentsList.innerHTML = '<p>No fragments found.</p>';
    fragmentsSection.hidden = false;
    return;
  }

  fragments.forEach((fragment) => {
    fragmentsList.appendChild(createFragmentCard(user, fragment, refresh));
  });

  fragmentsSection.hidden = false;
}

async function init() {
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');
  const fragmentForm = document.querySelector('#fragment-form');
  const fragmentText = document.querySelector('#fragment-text');
  const fragmentFile = document.querySelector('#fragment-file');
  const fragmentType = document.querySelector('#fragment-type');

  loginBtn.onclick = () => {
    signIn();
  };

  // Show a file picker for image types, and a textarea for everything else
  fragmentType.onchange = () => {
    const isImage = IMAGE_TYPES.has(fragmentType.value);
    fragmentText.hidden = isImage;
    fragmentFile.hidden = !isImage;
  };

  const user = await getUser();

  if (!user) {
    return;
  }

  userSection.hidden = false;
  userSection.querySelector('.username').innerText = user.username;

  loginBtn.disabled = true;
  fragmentForm.hidden = false;

  const refresh = async () => {
    const fragmentsData = await getUserFragments(user);
    await displayFragments(user, fragmentsData, refresh);
  };

  await refresh();

  fragmentForm.onsubmit = async (event) => {
    event.preventDefault();

    const type = fragmentType.value;
    const body = IMAGE_TYPES.has(type) ? fragmentFile.files[0] : fragmentText.value.trim();

    if (!body) {
      return;
    }

    try {
      await createFragment(user, body, type);
    } catch (err) {
      logger.error({ err }, 'Unable to create fragment');
      return;
    }

    await refresh();

    fragmentText.value = '';
    fragmentFile.value = '';
  };
}

addEventListener('DOMContentLoaded', init);
