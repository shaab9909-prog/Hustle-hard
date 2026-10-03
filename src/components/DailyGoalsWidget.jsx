import React, { useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';

export default function DailyGoalsWidget({ widget, editMode, onChange }) {
  const { tasks = [], bgOpacity = 0.4, textcolor = '#ffffff' } = widget;
  const [newTaskText, setNewTaskText] = useState('');
  const [newTag, setNewTag] = useState('Physics');

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
      tag: newTag
    };
    onChange({ tasks: [newTask, ...tasks] });
    setNewTaskText('');
  };

  const toggleTask = (id) => {
    onChange({
      tasks: tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    });
  };

  const deleteTask = (id) => {
    onChange({
      tasks: tasks.filter(t => t.id !== id)
    });
  };

  return (
    <div
      className="w-full h-full rounded-2xl p-4 flex flex-col backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden transition-all"
      style={{
        backgroundColor: `rgba(11, 17, 32, ${bgOpacity})`
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3" data-drag-handle="true">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#00F2FE]" />
          <span className="font-semibold text-xs tracking-wider uppercase text-white font-syne">
            Daily Targets
          </span>
          <span className="text-[11px] text-white/40">
            {completedCount} of {tasks.length} ({progressPercent}%)
          </span>
        </div>
        <div className="text-[11px] font-mono text-[#00F2FE] font-bold">
          {progressPercent}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-3 border border-white/5">
        <div
          className="h-full bg-gradient-to-r from-[#00F2FE] to-[#38bdf8] transition-all duration-300"
          style={{
            width: `${progressPercent}%`,
            boxShadow: '0 0 10px #00F2FE80'
          }}
        />
      </div>

      {/* Input Field */}
      <form onSubmit={handleAddTask} className="flex gap-2 mb-3">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="Add target (e.g., Solve 50 MCQs)..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]/50"
        />
        <button
          type="submit"
          className="p-1.5 rounded-lg bg-[#00F2FE] hover:bg-[#38bdf8] text-slate-950 transition-all font-bold"
          title="Add Target"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {/* Targets List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30 text-xs">
            <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
            <span>All clear! Add your primary targets for today</span>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`group flex items-center justify-between p-2 rounded-xl border transition-all ${
                task.completed
                  ? 'bg-white/[0.02] border-white/5 opacity-50'
                  : 'bg-white/[0.04] border-white/10 hover:border-[#00F2FE]/40'
              }`}
            >
              <div
                onClick={() => toggleTask(task.id)}
                className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
              >
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                    task.completed
                      ? 'bg-[#00F2FE] border-[#00F2FE] text-slate-950'
                      : 'border-white/30 hover:border-[#00F2FE]'
                  }`}
                >
                  {task.completed && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                </div>
                <span
                  className={`text-xs ${
                    task.completed
                      ? 'line-through text-white/40'
                      : 'text-white/90'
                  }`}
                >
                  {task.text}
                </span>
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-rose-400/70 hover:text-rose-300 transition-opacity"
                title="Delete Target"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}