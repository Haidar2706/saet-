// auction.js


// Пользователи


let users = [
  { username: 'admin', password: 'admin', role: 'admin' },
  { username: 'user', password: 'user', role: 'user' },
  { username: 'haidar', password: 'haidar', role: 'haidar' }
];


// Заменим users, если они есть в localStorage
const storedUsers = localStorage.getItem('users');
if (storedUsers) {
  try {
    users = JSON.parse(storedUsers);
  } catch (e) {
    console.error('Ошибка при загрузке users из localStorage:', e);
  }
}
// Лоты
let winners = [];
let lots = [
  {
    id: 1,
    title: 'Лот 1',
    category: 'Категория A',
    price: 1000,
    size: '10 кг',
    status: 'active',
    image: 'https://via.placeholder.com/100',
    bids: [],
    endTime: Date.now() + 1000 * 60 * 5
  },
  {
    id: 2,
    title: 'Лот 2',
    category: 'Категория B',
    price: 2000,
    size: '15x25 см',
    status: 'active',
    image: 'https://via.placeholder.com/100',
    bids: [],
    endTime: Date.now() + 1000 * 60 * 10
  }
];


let currentUser = null;

// DOM элементы
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');

const currentUserSpan = document.getElementById('currentUser');
const lotsList = document.getElementById('lotsList');
const adminPanel = document.getElementById('adminPanel');

const addLotForm = document.getElementById('addLotForm');
const newLotTitle = document.getElementById('newLotTitle');
const newLotCategory = document.getElementById('newLotCategory');
const newLotPrice = document.getElementById('newLotPrice');
const newLotStatus = document.getElementById('newLotStatus');
const newLotSize = document.getElementById('newLotSize'); // добавлен

loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);
addLotForm.addEventListener('submit', addLot);
const addUserForm = document.getElementById('addUserForm');
const newUsername = document.getElementById('newUsername');
const newPassword = document.getElementById('newPassword');
const newUserRole = document.getElementById('newUserRole');

addUserForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const username = newUsername.value.trim();
  const password = newPassword.value;
  const role = newUserRole.value;

  if (!username || !password) {
    alert('Введите имя пользователя и пароль');
    return;
  }

  if (users.find(u => u.username === username)) {
    alert('Пользователь с таким именем уже существует');
    return;
  }

  users.push({ username, password, role });
  localStorage.setItem('users', JSON.stringify(users));

  addUserForm.reset();
  alert(`Пользователь "${username}" добавлен`);
});


// Telegram
function sendTelegramMessage(text) {
  const token = '7816037426:AAFVg73M8KYemZl4OoY2dYGyH2jd2_2S7lw';
  const chatId = '1237960319';
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
}

function login() {
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    currentUser = user;
    localStorage.setItem('auctionUser', JSON.stringify(currentUser));
    loginError.textContent = '';
    showMainPage();
  } else {
    loginError.textContent = 'Неверный логин или пароль';
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('auctionUser');
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('mainPage').classList.add('hidden');
}

function showMainPage() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('mainPage').classList.remove('hidden');
  currentUserSpan.textContent = currentUser.username;

  if (currentUser.role === 'admin') {
    adminPanel.classList.remove('hidden');
  } else {
    adminPanel.classList.add('hidden');
  }

  renderLots();

  // ✅ Перезапуск таймера каждый раз при входе
  if (!window.timerStarted) {
    window.timerStarted = true;
    setInterval(updateTimers, 1000);
  }
}


function renderLots() {
  const tbody = document.getElementById('lotsList');
  const searchValue = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  const filteredLots = lots.filter(lot => lot.title.toLowerCase().includes(searchValue));

  tbody.innerHTML = '';

  let totalBids = 0;
  let totalValue = 0;

  filteredLots.forEach((lot, index) => {
    const highestBid = lot.bids.length ? Math.max(...lot.bids.map(b => b.amount)) : lot.price;
    const remainingMs = lot.endTime ? lot.endTime - Date.now() : null;

    totalBids += lot.bids.length;
    totalValue += highestBid;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${lot.title}</td>
      <td>${lot.category}</td>
      <td>${
        currentUser?.role === 'admin'
          ? (lot.size || '-')
          : `<input type="text" placeholder="Ваш объём" id="userSize${lot.id}" style="width: 90px;" />`
      }</td>
      <td>${lot.price} сом</td>
      <td>${highestBid} сом</td>
      <td id="status${lot.id}">${lot.status}</td>
      <td>${lot.status === 'active' && remainingMs > 0 ? `<span id="timer${lot.id}">${formatTime(remainingMs)}</span>` : '—'}</td>
      <td>
        ${lot.status === 'active' && remainingMs > 0 ? `<input type="number" id="bidAmount${lot.id}" min="${highestBid + 1}" placeholder="Ставка" style="width: 80px;" />` : ''}
      </td>
      <td>
        ${lot.status === 'active' && remainingMs > 0 ? `<button onclick="placeBid(${lot.id})">Ставка</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);

    // 📜 История ставок (перемещена сюда)
    if (lot.bids.length > 0) {
      const bidHistoryRow = document.createElement('tr');
      bidHistoryRow.innerHTML = `
        <td colspan="10" style="text-align: left; background: #f9f9f9;">
          <b>📜 История ставок:</b><br/>
          ${lot.bids.map(b => {
            const date = new Date(b.time).toLocaleString();
            return `👤 <b>${b.user}</b>: 💰 ${b.amount} сом ${b.userSize ? `📦 <i>${b.userSize}</i>` : ''} 🕒 ${date}`;
          }).reverse().join('<br/>')}
        </td>
      `;
      tbody.appendChild(bidHistoryRow);
    }
  });

  document.getElementById('lotsTable').classList.remove('hidden');
  const stats = `👥 Лотов: ${filteredLots.length} | 💰 Ставок: ${totalBids} | 📈 Всего: ${totalValue} сом`;
  document.getElementById('statsPanel').textContent = stats;
}

if (lot.bids.length > 0) {
  const bidHistoryRow = document.createElement('tr');
  bidHistoryRow.innerHTML = `
    <td colspan="10" style="text-align: left; background: #f9f9f9;">
      <b>📜 История ставок:</b><br/>
      ${lot.bids.map(b => {
        const date = new Date(b.time).toLocaleString();
        return `👤 <b>${b.user}</b>: 💰 ${b.amount} сом ${b.userSize ? `📦 <i>${b.userSize}</i>` : ''} 🕒 ${date}`;
      }).reverse().join('<br/>')}
    </td>
  `;
  tbody.appendChild(bidHistoryRow);
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms / 1000) % 60);
  return `${minutes}м ${seconds < 10 ? '0' : ''}${seconds}с`;
}

function renderLots() {
  const tbody = document.getElementById('lotsList');
  const searchValue = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  const filteredLots = lots.filter(lot => lot.title.toLowerCase().includes(searchValue));

  tbody.innerHTML = '';

  let totalBids = 0;
  let totalValue = 0;

  filteredLots.forEach((lot, index) => {
    const highestBid = lot.bids.length ? Math.max(...lot.bids.map(b => b.amount)) : lot.price;
    const remainingMs = lot.endTime ? lot.endTime - Date.now() : null;

    totalBids += lot.bids.length;
    totalValue += highestBid;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${lot.title}</td>
      <td>${lot.category}</td>
      <td>${
        currentUser?.role === 'admin'
          ? (lot.size || '-')
          : `<input type="text" placeholder="Ваш объём" id="userSize${lot.id}" style="width: 90px;" />`
      }</td>
      <td>${lot.price} сом</td>
      <td>${highestBid} сом</td>
      <td id="status${lot.id}">${lot.status}</td>
      <td>${lot.status === 'active' && remainingMs > 0 ? `<span id="timer${lot.id}">${formatTime(remainingMs)}</span>` : '—'}</td>
      <td>
        ${lot.status === 'active' && remainingMs > 0 ? `<input type="number" id="bidAmount${lot.id}" min="${highestBid + 1}" placeholder="Ставка" style="width: 80px;" />` : ''}
      </td>
      <td>
        ${lot.status === 'active' && remainingMs > 0 ? `<button onclick="placeBid(${lot.id})">Ставка</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);

    if (lot.bids.length > 0) {
      const bidHistoryRow = document.createElement('tr');
      bidHistoryRow.innerHTML = `
        <td colspan="10" style="text-align: left; background: #f9f9f9;">
          <b>📜 История ставок:</b><br/>
          ${lot.bids.map(b => {
            const date = new Date(b.time).toLocaleString();
            return `👤 <b>${b.user}</b>: 💰 ${b.amount} сом ${b.userSize ? `📦 <i>${b.userSize}</i>` : ''} 🕒 ${date}`;
          }).reverse().join('<br/>')}
        </td>
      `;
      tbody.appendChild(bidHistoryRow);
    }
  });

  document.getElementById('lotsTable').classList.remove('hidden');
  const stats = `👥 Лотов: ${filteredLots.length} | 💰 Ставок: ${totalBids} | 📈 Всего: ${totalValue} сом`;
  document.getElementById('statsPanel').textContent = stats;
}
function renderWinners() {
  if (!currentUser || currentUser.role !== "admin") return;

  const winnersPanel = document.getElementById("winnersPanel");
  winnersPanel.innerHTML = "<h3>🏆 Победители:</h3>";

  if (!winners || winners.length === 0) {
    winnersPanel.innerHTML += "<p>Пока нет победителей.</p>";
    return;
  }

  const table = document.createElement("table");
  table.classList.add("winners-table");

  table.innerHTML = `
    <thead>
      <tr>
        <th>№</th>
        <th>Лот</th>
        <th>Ставка</th>
        <th>Пользователь</th>
        <th>Объём</th>
      </tr>
    </thead>
    <tbody>
      ${winners.map((w, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${w.title}</td>
          <td>${w.bid}</td>
          <td>${w.user}</td>
          <td>${w.volume}</td>
        </tr>
      `).join("")}
    </tbody>
  `;

  winnersPanel.appendChild(table);
}




  // ✅ Таймер запускается при загрузке
  function updateTimers() {
  const now = Date.now();
  lots.forEach(lot => {
    if (lot.status === 'active' && lot.endTime) {
      const remaining = lot.endTime - now;
      const timerEl = document.getElementById(`timer${lot.id}`);
      const statusEl = document.getElementById(`status${lot.id}`);

      if (remaining > 0 && timerEl) {
        timerEl.textContent = formatTime(remaining);
      } else if (remaining <= 0) {
        lot.status = 'sold'; // Завершить лот
        if (statusEl) statusEl.textContent = 'sold';
        if (timerEl) timerEl.textContent = '—';
        renderLots(); // Перерисовать таблицу
      }
      if (remaining <= 0 && lot.status === 'active') {
        lot.status = 'sold';
        if (lot.currentBidder) {
          winners.push({
            lotId: lot.id,
            title: lot.title,
            winner: lot.currentBidder,
            bid: lot.currentPrice
          });
          localStorage.setItem('winners', JSON.stringify(winners));
        }
      
        const winner = lot.bids.length ? lot.bids[lot.bids.length - 1] : null;
        if (winner) {
          winners.push({ lotTitle: lot.title, user: winner.user, amount: winner.amount });
        }
      }
      
    }
  });
}
// Добавление пользователя (форма и обработчик)
document.getElementById('addUserForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value.trim();
  const role = document.getElementById('newUserRole').value;

  if (!username || !password) {
    alert('Введите имя пользователя и пароль');
    return;
  }

  if (users.find(u => u.username === username)) {
    alert('Пользователь с таким именем уже существует');
    return;
  }

  users.push({ username, password, role });
  localStorage.setItem('users', JSON.stringify(users));
  alert(`Пользователь "${username}" добавлен`);
  this.reset();
});

// Функция рендеринга победителей (только для админа)
function renderWinners() {
  const panel = document.getElementById('winnersPanel');
  if (!currentUser || currentUser.role !== 'admin') {
    if(panel) panel.classList.add('hidden');
    return;
  }

  let winners = JSON.parse(localStorage.getItem('winners') || '[]');
  if (winners.length === 0) {
    panel.innerHTML = '<p>Победителей пока нет</p>';
    panel.classList.remove('hidden');
    return;
  }

  let html = '<h3>Победители торгов</h3>';
  html += '<table border="1" style="width:100%; border-collapse: collapse;"><tr><th>Лот</th><th>Победитель</th><th>Ставка</th></tr>';
  winners.forEach(w => {
    html += `<tr><td>${w.title}</td><td>${w.winner}</td><td>${w.bid}</td></tr>`;
  });
  html += '</table>';
  panel.innerHTML = html;
  panel.classList.remove('hidden');
}

// В updateTimers() или где у тебя обработка окончания лотов — добавляем запись победителя
function updateTimers() {
  const now = Date.now();
  lots.forEach(lot => {
    if (lot.status === 'active' && lot.endTime) {
      const remaining = lot.endTime - now;
      const timerEl = document.getElementById(`timer${lot.id}`);
      const statusEl = document.getElementById(`status${lot.id}`);

      if (remaining > 0 && timerEl) {
        timerEl.textContent = formatTime(remaining);
        if (remaining <= 0 && lot.status !== 'sold') {
          lot.status = 'sold';
          const td = document.getElementById(`timer-${lot.id}`);
          if (td) td.textContent = "Завершён";
        
          if (lot.bids && lot.bids.length > 0) {
            const lastBid = lot.bids[lot.bids.length - 1];
            let winners = JSON.parse(localStorage.getItem('winners') || '[]');
        
            winners.push({
              title: lot.title,
              winner: lastBid.user,
              bid: lastBid.amount
            });
        
            localStorage.setItem('winners', JSON.stringify(winners));
            renderWinners();
          }
        }
        
      } else if (remaining <= 0) {
        lot.status = 'sold'; // Завершить лот
        if (statusEl) statusEl.textContent = 'sold';
        if (timerEl) timerEl.textContent = '—';
        renderLots(); // Перерисовать таблицу
        
        // Добавляем победителя
        let winners = JSON.parse(localStorage.getItem('winners') || '[]');
        if (lot.bids.length > 0) {
          const lastBid = lot.bids[lot.bids.length - 1];
          // Проверяем, чтобы победитель не дублировался
          const alreadyExists = winners.some(w => w.title === lot.title && w.winner === lastBid.user);
          if (!alreadyExists) {
            winners.push({
              title: lot.title,
              winner: lastBid.user,
              bid: lastBid.amount
            });
            localStorage.setItem('winners', JSON.stringify(winners));
            renderWinners();
          }
        }
      }
    }
  });
}

// Вызов renderWinners после renderLots, чтобы обновлять панель
function showMainPage() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('mainPage').classList.remove('hidden');
  currentUserSpan.textContent = currentUser.username;

  if (currentUser.role === 'admin') {
    adminPanel.classList.remove('hidden');
  } else {
    adminPanel.classList.add('hidden');
  }

  renderLots();
  renderWinners();

  if (!window.timerStarted) {
    window.timerStarted = true;
    setInterval(updateTimers, 1000);
  }
}

setInterval(updateTimers, 1000);
function renderWinners() {
  const panel = document.getElementById('winnersPanel');
  if (!winners.length) {
    panel.innerHTML = '<p>Нет завершённых лотов с победителями.</p>';
    return;
  }

  panel.innerHTML = '<h3>🏆 Победители:</h3>' + winners.map(w => 
    `<p>Лот <b>${w.lotTitle}</b> — 👤 ${w.user}, 💰 ${w.amount} сом</p>`
  ).join('');
}



function placeBid(lotId) {
  const input = document.getElementById(`bidAmount${lotId}`);
  const amount = parseFloat(input?.value);
  const lot = lots.find(l => l.id === lotId);
  if (!lot) return alert('Лот не найден');

  const highestBid = lot.bids.length ? Math.max(...lot.bids.map(b => b.amount)) : lot.price;

  if (isNaN(amount) || amount <= highestBid) {
    return alert(`Ставка должна быть больше ${highestBid}`);
  }

  // Получаем объём
  let userSize = '';
  const userSizeInput = document.getElementById(`userSize${lotId}`);

  if (currentUser.role !== 'admin') {
    if (!userSizeInput || !userSizeInput.value.trim()) {
      alert('Пожалуйста, укажите объём перед ставкой');
      return;
    }
    userSize = userSizeInput.value.trim();
  } else {
    userSize = lot.size || '';
  }

  // Сохраняем ставку
  lot.bids.push({ user: currentUser.username, amount, time: Date.now(), userSize });
  // 🔁 Продление таймера при новой ставке (если меньше 2 мин до конца)
  const now = Date.now();
  const remaining = lot.endTime - now;
  const EXTEND_THRESHOLD = 2 * 60 * 1000; // 2 минуты
  const EXTEND_TIME = 2 * 60 * 1000; // продлеваем на 2 минуты

  if (remaining > 0 && remaining < EXTEND_THRESHOLD) {
    lot.endTime = now + EXTEND_TIME;
  }


  input.value = '';
  if (userSizeInput) userSizeInput.value = '';

  // Отправка в Telegram
  sendTelegramMessage(
    `💸 <b>Ставка:</b> ${amount} сом\n<b>Пользователь:</b> ${currentUser.username}` +
    (userSize ? `\n<b>Объём:</b> ${userSize}` : '') +
    `\n<b>Лот:</b> ${lot.title}`
  );

  renderLots();
  showToast(`Ставка принята: ${amount} сом`);
}



function addLot(event) {
  event.preventDefault();

  const title = newLotTitle.value;
  const category = newLotCategory.value;
  const price = parseFloat(newLotPrice.value);
  const status = newLotStatus.value;
  const size = newLotSize.value.trim();
  const endTimeInput = document.getElementById('newLotEndTime').value;
  const endTime = status === 'active' ? new Date(endTimeInput).getTime() : null;

  lots.push({
    id: lots.length + 1,
    title,
    category,
    price,
    size,
    image: 'https://via.placeholder.com/100',
    status,
    bids: [],
    endTime
  });

  addLotForm.reset();
  renderLots();
}




  

window.onload = () => {
  const savedUser = localStorage.getItem('auctionUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showMainPage();
  }
};

// ===== JSON Сохранение и Загрузка =====

function saveToLocalStorage() {
  localStorage.setItem('lots', JSON.stringify(lots));
  localStorage.setItem('users', JSON.stringify(users));
  const data = { users, lots };
  localStorage.setItem('auctionData', JSON.stringify(data));
  alert('Сохранено в LocalStorage');
}

function loadFromLocalStorage() {
  const data = JSON.parse(localStorage.getItem('auctionData'));
  if (data) {
    if (Array.isArray(data.users)) users.splice(0, users.length, ...data.users);
    if (Array.isArray(data.lots)) lots = data.lots;
    alert('Загружено из LocalStorage');
    renderLots();
  } else {
    alert('Нет сохранённых данных');
  }
}

function downloadJSON() {
  const data = { users, lots };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'auction-data.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function uploadJSONFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data.users)) users.splice(0, users.length, ...data.users);
      if (Array.isArray(data.lots)) lots = data.lots;
      alert('Загружено из файла!');
      renderLots();
    } catch (err) {
      alert('Ошибка при чтении JSON');
    }
  };
  reader.readAsText(file);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = '#28a745';
  toast.style.color = 'white';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '6px';
  toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  toast.style.zIndex = 9999;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet);

    // Ожидаем поля: title, category, price, size, endTime (в формате "YYYY-MM-DDTHH:MM")
    json.forEach((row, index) => {
      if (row.title && row.category && row.price && row.size && row.endTime) {
        lots.push({
          id: lots.length + 1,
          title: row.title,
          category: row.category,
          price: parseFloat(row.price),
          size: row.size,
          image: 'https://via.placeholder.com/100',
          status: 'active',
          bids: [],
          endTime: new Date(row.endTime).getTime()
        });
      }
    });

    renderLots();
    alert('Лоты из Excel загружены!');
  };

  reader.readAsArrayBuffer(file);
}
// Загрузка победителей из localStorage
winners = JSON.parse(localStorage.getItem('winners')) || [];

// Отрисовка победителей (если админ)
renderWinners();

function renderWinners() {
  if (!currentUser || currentUser.role !== 'admin') return;

  const winnersPanel = document.getElementById('winnersPanel');
  const winners = JSON.parse(localStorage.getItem('winners') || '[]');

  if (winners.length === 0) {
    winnersPanel.innerHTML = "<p>Пока нет завершённых лотов с победителями.</p>";
    return;
  }

  let html = "<h3>🏆 Победители</h3><table><tr><th>Лот</th><th>Победитель</th><th>Ставка</th></tr>";
  for (let w of winners) {
    html += `<tr><td>${w.title}</td><td>${w.winner}</td><td>${w.bid}</td></tr>`;
  }
  html += "</table>";
  winnersPanel.innerHTML = html;
}
