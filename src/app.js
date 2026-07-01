// src/app.js

import { signIn, getUser } from './auth';
import { getUserFragments, createFragment } from './api';

async function init() {
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');
  const fragmentForm = document.querySelector('#fragment-form');
  const fragmentText = document.querySelector('#fragment-text');

  loginBtn.onclick = () => {
    signIn();
  };

  const user = await getUser();
  if (!user) {
    return;
  }

  await getUserFragments(user);

  userSection.hidden = false;
  userSection.querySelector('.username').innerText = user.username;
  loginBtn.disabled = true;

  fragmentForm.hidden = false;

  fragmentForm.onsubmit = async (event) => {
    event.preventDefault();

    const text = fragmentText.value.trim();
    if (!text) return;

    await createFragment(user, text);
    await getUserFragments(user);

    fragmentText.value = '';
  };
}

addEventListener('DOMContentLoaded', init);