'use client';

import { useState } from 'react';

export function useNutritionAgent() {
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateRecipe(payload: {
    user_prompt: string;
    mode: 'single_meal' | 'full_day';
    meal_type: string;
    cuisine_preference: string[];
    target_calories: number;
    target_protein: number;
    target_carbs: number;
    target_fat: number;
    ingredients: Array<{ id: string; name: string; amount: number; unit: string }>;
  }) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8001/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to generate recipe: ${response.status}`);
      }

      const data = await response.json();
      setState(data);
      return data;
    } catch (err) {
      console.error('Recipe generation error:', err);
      setError(err instanceof Error ? err.message : 'Unexpected error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function parsePantryImage(file: File) {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('upload', file);

      const response = await fetch('http://127.0.0.1:8001/submit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to parse image: ${response.status}`);
      }

      return [
        { id: `ing-${Date.now()}-1`, name: 'tomato', amount: 100, unit: 'g' as const },
        { id: `ing-${Date.now()}-2`, name: 'spinach', amount: 50, unit: 'g' as const },
        { id: `ing-${Date.now()}-3`, name: 'egg', amount: 2, unit: 'whole' as const },
      ];
    } catch (err) {
      console.error('Image parsing error:', err);
      setError(err instanceof Error ? err.message : 'Unexpected error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function saveMeal(recipe: any) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8001/save_meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });
      if (!response.ok) throw new Error(`Failed to save meal: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Save meal error:', err);
      setError(err instanceof Error ? err.message : 'Unexpected error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchSavedMeals() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8001/saved_meals');
      if (!response.ok) throw new Error(`Failed to fetch saved meals: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Fetch saved meals error:', err);
      setError(err instanceof Error ? err.message : 'Unexpected error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error('Login failed');
      return await response.json();
    } catch (err) {
      setError('Login failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function register(username: string, password: string) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8001/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error('Registration failed. Username may already exist.');
      return await response.json();
    } catch (err) {
      setError('Registration failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function updateProfile(profile: any) {
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8001/update_profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return await response.json();
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function logDailyMeal(username: string, date: string, recipe: any, shoppingCost = 0, shoppingItems: any[] = []) {
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8001/log_daily_meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, date, recipe, shopping_cost: shoppingCost, shopping_items: shoppingItems }),
      });
      if (!response.ok) throw new Error('Failed to log meal');
      return await response.json();
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchWeeklySummary(username: string, weekStart: string) {
    try {
      const response = await fetch(
        `http://127.0.0.1:8001/weekly_summary?username=${encodeURIComponent(username)}&week_start=${encodeURIComponent(weekStart)}`
      );
      if (!response.ok) throw new Error('Failed to fetch weekly summary');
      return await response.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async function fetchDailySummary(username: string, date: string) {
    setIsLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8001/daily_summary?username=${encodeURIComponent(username)}&date=${encodeURIComponent(date)}`);
      if (!response.ok) throw new Error('Failed to fetch daily summary');
      return await response.json();
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function aiSwap(payload: {
    recipe: any;
    reason: string;
    cuisine_preference: string[];
    meal_type: string;
    target_calories: number;
    target_protein: number;
    target_carbs: number;
    target_fat: number;
  }) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8001/ai_swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Swap failed: ${response.status}`);
      const data = await response.json();
      setState(data);
      return data;
    } catch (err) {
      console.error('AI swap error:', err);
      setError(err instanceof Error ? err.message : 'Swap failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { state, isLoading, error, generateRecipe, parsePantryImage, saveMeal, fetchSavedMeals, login, register, updateProfile, logDailyMeal, fetchDailySummary, fetchWeeklySummary, aiSwap };
}
