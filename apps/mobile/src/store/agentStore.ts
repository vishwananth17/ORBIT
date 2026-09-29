// ============================================================================
// Custom Agents & Personas Zustand Store (Phase 6)
// ============================================================================

import { create } from 'zustand';
import { CustomAgent, CreateCustomAgentInput, UpdateCustomAgentInput } from '@orbit/shared';
import { apiClient } from '../api/client';

interface AgentState {
  agents: CustomAgent[];
  presets: any[];
  activeAgent: CustomAgent | null;
  isLoading: boolean;
  error: string | null;

  loadAgents: (token?: string | null) => Promise<void>;
  setActiveAgent: (agent: CustomAgent | null) => void;
  createAgent: (input: CreateCustomAgentInput, token?: string | null) => Promise<CustomAgent>;
  updateAgent: (id: string, input: UpdateCustomAgentInput, token?: string | null) => Promise<CustomAgent>;
  deleteAgent: (id: string, token?: string | null) => Promise<void>;
  setDefaultAgent: (id: string, token?: string | null) => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  presets: [],
  activeAgent: null,
  isLoading: false,
  error: null,

  loadAgents: async (token?: string | null) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.getAgents(token);
      const defaultAgent = data.agents.find((a) => a.is_default) || data.agents[0] || null;
      set({
        agents: data.agents,
        presets: data.presets,
        activeAgent: get().activeAgent || defaultAgent,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setActiveAgent: (agent: CustomAgent | null) => {
    set({ activeAgent: agent });
  },

  createAgent: async (input: CreateCustomAgentInput, token?: string | null) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.createAgent(input, token);
      const newAgent = res.agent;
      set((state) => {
        const updatedAgents = newAgent.is_default
          ? [...state.agents.map((a) => ({ ...a, is_default: false })), newAgent]
          : [...state.agents, newAgent];
        return {
          agents: updatedAgents,
          activeAgent: newAgent.is_default ? newAgent : state.activeAgent,
          isLoading: false,
        };
      });
      return newAgent;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateAgent: async (id: string, input: UpdateCustomAgentInput, token?: string | null) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.updateAgent(id, input, token);
      const updated = res.agent;
      set((state) => {
        const updatedAgents = state.agents.map((a) => {
          if (a.id === id) return updated;
          if (updated.is_default) return { ...a, is_default: false };
          return a;
        });
        return {
          agents: updatedAgents,
          activeAgent: state.activeAgent?.id === id ? updated : state.activeAgent,
          isLoading: false,
        };
      });
      return updated;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteAgent: async (id: string, token?: string | null) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.deleteAgent(id, token);
      set((state) => {
        const remaining = state.agents.filter((a) => a.id !== id);
        const newActive = state.activeAgent?.id === id ? remaining[0] || null : state.activeAgent;
        return {
          agents: remaining,
          activeAgent: newActive,
          isLoading: false,
        };
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  setDefaultAgent: async (id: string, token?: string | null) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.setDefaultAgent(id, token);
      set((state) => ({
        agents: state.agents.map((a) => ({
          ...a,
          is_default: a.id === id,
        })),
        activeAgent: res.agent,
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));
