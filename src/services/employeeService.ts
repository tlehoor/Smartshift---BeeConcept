import { Employee } from '../types';
import { INITIAL_EMPLOYEES } from '../mock/data';

export const employeeService = {
  getEmployees: async (): Promise<Employee[]> => {
    return Promise.resolve([...INITIAL_EMPLOYEES]);
  },

  getEmployeeById: async (id: string): Promise<Employee | undefined> => {
    return Promise.resolve(INITIAL_EMPLOYEES.find((e) => e.id === id));
  },

  updateEmployee: async (updated: Employee): Promise<Employee> => {
    return Promise.resolve({ ...updated });
  },

  toggleLockAccount: async (id: string): Promise<{ id: string; status: 'ACTIVE' | 'BAN' }> => {
    const emp = INITIAL_EMPLOYEES.find((e) => e.id === id);
    const newStatus = emp?.accountStatus === 'ACTIVE' ? 'BAN' : 'ACTIVE';
    return Promise.resolve({ id, status: newStatus });
  },
};
