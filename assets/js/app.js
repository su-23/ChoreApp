const app = {
    parents: JSON.parse(localStorage.getItem('choreData')) || [],
    currentParent: null,
    currentKid: '',
    POINTS_PER_TASK: 5,
    save() { localStorage.setItem('choreData', JSON.stringify(this.parents)) }
  };
  
  // View Management
  function showView(id) {
    document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if (id === 'parentDashboard') renderParentDashboard();
    if (id === 'childDashboard') renderChildDashboard();
  }
  
  function updateKidDropdown() {
    const dropdown = document.getElementById('kidDropdown');
    const childSelect = document.getElementById('childSelect');
    
    dropdown.innerHTML = '';
    childSelect.innerHTML = '';
  
    if (app.currentParent?.kids) {
      app.currentParent.kids.forEach(kid => {
        dropdown.innerHTML += `<option value="${kid}">${kid}</option>`;
      });
    }
  
    app.parents.forEach(parent => {
      if (parent?.kids) {
        parent.kids.forEach(kid => {
          childSelect.innerHTML += `<option value="${kid}">${kid} (${parent.name}'s child)</option>`;
        });
      }
    });
  }
  
  // Parent Functions
  function loginParent() {
    const name = document.getElementById('parentName').value;
    const password = document.getElementById('parentPassword').value;
    const parent = app.parents.find(p => p.name === name && p.password === password);
    if (parent) {
      app.currentParent = parent;
      document.getElementById('welcomeParent').textContent = `Welcome, ${parent.name}`;
      showView('parentDashboard');
    } else alert('Invalid credentials');
  }
  
  function signupParent() {
    const name = document.getElementById('newParentName').value;
    const password = document.getElementById('newParentPassword').value;
    if (password !== document.getElementById('confirmParentPassword').value) return alert('Passwords mismatch');
    if (app.parents.some(p => p.name === name)) return alert('Name taken');
    
    app.currentParent = { name, password, kids: [], tasks: {}, rewards: {} };
    app.parents.push(app.currentParent);
    app.save();
    showView('parentDashboard');
  }
  
  function addKid() {
    const name = document.getElementById('kidName').value;
    const password = document.getElementById('kidPassword').value;
    if (!name || !password) return alert('Missing fields');
    
    if (!app.currentParent.kids) app.currentParent.kids = [];
    if (!app.currentParent.rewards) app.currentParent.rewards = {};
    
    app.currentParent.kids.push(name);
    app.currentParent.rewards[name] = 0;
    app.save();
    updateKidDropdown();
    document.getElementById('kidName').value = '';
    document.getElementById('kidPassword').value = '';
  }
  
  function assignTask() {
    const kid = document.getElementById('kidDropdown').value;
    const taskInput = document.getElementById('customTask').value;
    const task = taskInput || document.getElementById('taskSelect').value;
    const date = document.getElementById('taskDate').value || new Date().toISOString().split('T')[0];
    
    if (!task) return alert('Please enter or select a task');
  
    if (!app.currentParent.tasks) app.currentParent.tasks = {};
    if (!app.currentParent.tasks[date]) app.currentParent.tasks[date] = [];
    
    app.currentParent.tasks[date].push({
      id: Date.now(),
      task,
      points: app.POINTS_PER_TASK,
      assignedTo: kid,
      status: 'pending',
      approved: false
    });
    
    document.getElementById('customTask').value = '';
    app.save();
    renderParentDashboard();
  }
  
  function clearWeeklyTasks() {
    if (!confirm('This will permanently remove all approved tasks older than 7 days. Continue?')) return;
    
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    Object.entries(app.currentParent.tasks).forEach(([dateStr, tasks]) => {
      const taskDate = new Date(dateStr);
      if (taskDate < oneWeekAgo) {
        delete app.currentParent.tasks[dateStr];
      }
    });
    
    app.save();
    renderParentDashboard();
    alert('Old tasks cleared successfully!');
  }
  
  // Child Functions
  function loginChild() {
    const name = document.getElementById('childSelect').value;
    const password = document.getElementById('childPassword').value;
    const parent = app.parents.find(p => p.kids?.includes(name));
    
    if (parent) {
      app.currentParent = parent;
      app.currentKid = name;
      document.getElementById('welcomeChild').textContent = `Hi ${name}!`;
      showView('childDashboard');
    } else alert('Invalid credentials');
  }
  
  function toggleTask(taskId, status) {
    const tasks = Object.values(app.currentParent.tasks).flat();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      if (status === 'completed') task.status = 'completed';
      app.save();
      renderChildDashboard();
    }
  }
  
  function approveTask(taskId, approved) {
    const tasks = Object.values(app.currentParent.tasks).flat();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
  
    if (approved) {
      task.status = 'approved';
      app.currentParent.rewards[task.assignedTo] = 
        (app.currentParent.rewards[task.assignedTo] || 0) + task.points;
    } else {
      task.status = 'rejected';
    }
    app.save();
    renderParentDashboard();
  }
  
  // Rendering Functions
  function renderParentDashboard() {
    updateKidDropdown();
    let html = '';
    
    if (app.currentParent.tasks) {
      const hasOldTasks = Object.keys(app.currentParent.tasks).some(dateStr => {
        const taskDate = new Date(dateStr);
        const today = new Date();
        return taskDate < new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      });
      
      document.querySelector('.clear-tasks-btn').style.display = hasOldTasks ? 'block' : 'none';
  
      Object.entries(app.currentParent.tasks).forEach(([date, tasks]) => {
        html += `<h3>${date}</h3>`;
        tasks.forEach(task => {
          html += `
            <div class="task" data-status="${task.status === 'completed' ? 'needs-approval' : task.status}">
              <div>${task.task} (${task.assignedTo}) - ${task.points}pts</div>
              <div class="task-actions">
                ${task.status === 'completed' ? `
                  <div class="approval-buttons">
                    <button class="btn-sm btn-success" onclick="approveTask(${task.id}, true)">Approve</button>
                    <button class="btn-sm btn-danger" onclick="approveTask(${task.id}, false)">Reject</button>
                  </div>
                ` : ''}
                ${task.status === 'approved' ? `<i class="fas fa-check-circle" style="color: var(--success);"></i>` : ''}
                ${task.status === 'rejected' ? `<i class="fas fa-times-circle" style="color: var(--danger);"></i>` : ''}
              </div>
            </div>
          `;
        });
      });
    }
    
    document.getElementById('allTasks').innerHTML = html || '<p>No tasks yet</p>';
  }
  
  function renderChildDashboard() {
    const today = new Date().toISOString().split('T')[0];
    let tasks = [];
    
    if (app.currentParent.tasks?.[today]) {
      tasks = app.currentParent.tasks[today].filter(t => t.assignedTo === app.currentKid);
    }
    
    let html = '';
    tasks.forEach(task => {
      html += `
        <div class="task" data-status="${task.status}">
          <div>${task.task} - ${task.points}pts</div>
          <div class="task-actions">
            ${task.status === 'pending' ? `
              <button class="btn-sm" onclick="toggleTask(${task.id}, 'started')">Start</button>
            ` : task.status === 'started' ? `
              <button class="btn-sm btn-warning" onclick="toggleTask(${task.id}, 'completed')">Complete</button>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    document.getElementById('childTasks').innerHTML = html || '<p>No tasks today</p>';
    document.getElementById('totalScore').textContent = 
      app.currentParent.rewards?.[app.currentKid] || 0;
  }
  
  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('taskDate').valueAsDate = new Date();
    
    if (app.parents.length > 0) {
      app.currentParent = app.parents[0];
      updateKidDropdown();
    }
  });