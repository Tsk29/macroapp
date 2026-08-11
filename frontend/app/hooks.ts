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
      const response = await fetch('http://127.0.0.1:8000/generate', {
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

      const response = await fetch('http://127.0.0.1:8000/parse-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to parse image: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Image parsing error:', err);
      setError(err instanceof Error ? err.message : 'Unexpected error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { state, isLoading, error, generateRecipe, parsePantryImage };
}
