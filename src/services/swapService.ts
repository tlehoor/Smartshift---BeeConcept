import { SwapRequest, SwapCandidate, Employee, ShiftAssignment } from '../types';
import { INITIAL_SWAP_REQUESTS } from '../mock/data';

export const swapService = {
  getRequests: async (): Promise<SwapRequest[]> => {
    return Promise.resolve([...INITIAL_SWAP_REQUESTS]);
  },

  getEligibleSwapCandidates: (
    myShift: ShiftAssignment,
    myEmployeeId: string,
    allShifts: ShiftAssignment[],
    allEmployees: Employee[]
  ): SwapCandidate[] => {
    const candidates: SwapCandidate[] = [];

    // Find all other shifts that myEmployee is NOT assigned to
    allShifts.forEach((targetShift) => {
      // Different shift
      if (targetShift.id === myShift.id) return;

      targetShift.assignedEmployeeIds.forEach((targetEmpId) => {
        if (targetEmpId === myEmployeeId) return;

        const targetEmp = allEmployees.find((e) => e.id === targetEmpId);
        if (!targetEmp || targetEmp.role === 'ADMIN' || targetEmp.accountStatus !== 'ACTIVE') return;

        // Check if targetEmp is already in myShift
        const targetInMyShift = myShift.assignedEmployeeIds.includes(targetEmpId);
        // Check if I am in targetShift
        const meInTargetShift = targetShift.assignedEmployeeIds.includes(myEmployeeId);

        const noConflict = !targetInMyShift && !meInTargetShift;
        const maxTwoPerDay = true;
        const availabilityMatch = true;

        candidates.push({
          employee: targetEmp,
          candidateShiftId: targetShift.id,
          candidateDayOfWeek: targetShift.dayOfWeek,
          candidateShiftIndex: targetShift.shiftIndex,
          isEligible: noConflict,
          checks: {
            noConflict,
            maxTwoPerDay,
            availabilityMatch,
          },
        });
      });
    });

    return candidates;
  },

  createSwapRequest: async (
    requesterId: string,
    requesterShiftId: string,
    targetEmployeeId: string,
    targetShiftId: string,
    note?: string
  ): Promise<SwapRequest> => {
    const newSwap: SwapRequest = {
      id: `swap-${Date.now().toString().slice(-4)}`,
      requesterId,
      requesterShiftId,
      targetEmployeeId,
      targetShiftId,
      status: 'PENDING',
      createdAt: 'Vừa xong',
      note,
    };
    return Promise.resolve(newSwap);
  },
};
