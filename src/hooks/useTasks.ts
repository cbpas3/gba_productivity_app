import { useTaskStore } from '../store/taskStore';

export function useTasks() {
  return useTaskStore((s) => ({
    tasks: s.tasks,
    addTask: s.addTask,
    completeTask: s.completeTask,
    deleteTask: s.deleteTask,
  }));
}
