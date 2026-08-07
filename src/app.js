import { signIn, getUser } from './auth';
import { getUserFragments, createFragment } from './api';

function displayFragments(data) {
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
    const div = document.createElement('div');

    div.innerHTML = `
      <hr />
      <p><strong>ID:</strong> ${fragment.id}</p>
      <p><strong>Type:</strong> ${fragment.type}</p>
      <p><strong>Size:</strong> ${fragment.size}</p>
      <p><strong>Created:</strong> ${fragment.created}</p>
      <p><strong>Updated:</strong> ${fragment.updated}</p>
    `;

    fragmentsList.appendChild(div);
  });

  fragmentsSection.hidden = false;
}

async function init() {
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');
  const fragmentForm = document.querySelector('#fragment-form');
  const fragmentText = document.querySelector('#fragment-text');
  const fragmentType = document.querySelector('#fragment-type');

  loginBtn.onclick = () => {
    signIn();
  };

  const user = await getUser();

  if (!user) {
    return;
  }

  userSection.hidden = false;
  userSection.querySelector('.username').innerText = user.username;

  loginBtn.disabled = true;
  fragmentForm.hidden = false;

  const fragmentsData = await getUserFragments(user);
  displayFragments(fragmentsData);

  fragmentForm.onsubmit = async (event) => {
    event.preventDefault();

    const text = fragmentText.value.trim();

    if (!text) {
      return;
    }

    await createFragment(user, text, fragmentType.value);

    const updatedFragments = await getUserFragments(user);
    displayFragments(updatedFragments);

    fragmentText.value = '';
  };
}

addEventListener('DOMContentLoaded', init);