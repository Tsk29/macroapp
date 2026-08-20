from __future__ import annotations

import asyncio

from dotenv import load_dotenv

from schemas import AppState
from nodes import chef_node, scraper_node, vision_node, parse_voice_node

load_dotenv(".env")


try:
    from langgraph import StateGraph
except ImportError:  # pragma: no cover
    class StateGraph:
        def __init__(self, name: str = "mock"):
            self.name = name
            self._nodes: dict[str, callable] = {}
            self._edges: dict[str, list[tuple[str, callable | None]]] = {}

        def add_node(self, name: str, func: callable) -> None:
            self._nodes[name] = func

        def add_edge(self, source: str, target: str, condition: callable | None = None) -> None:
            self._edges.setdefault(source, []).append((target, condition))

        async def execute(self, initial_state: AppState) -> AppState:
            state = initial_state
            state = await self._nodes["vision"](state)
            state = await self._nodes["chef"](state)
            if state.missing_ingredients:
                state = await self._nodes["scraper"](state)
            return state


def build_graph() -> StateGraph:
    graph = StateGraph(name="nutrition_agent")
    graph.add_node("vision", vision_node)
    graph.add_node("chef", chef_node)
    graph.add_node("scraper", scraper_node)
    graph.add_edge("vision", "chef")
    graph.add_edge("chef", "scraper", condition=lambda s: bool(s.missing_ingredients))
    return graph


async def run_workflow(state: AppState) -> AppState:
    graph = build_graph()
    final_state = await graph.execute(state)
    return final_state


async def main() -> None:
    state = AppState(user_prompt="Generate a high-protein meal with Italian flavors.")
    final_state = await run_workflow(state)

    print("Workflow completed.")
    print("Recipe:", final_state.recipe.name if final_state.recipe else "none")
    print("Missing ingredients:", final_state.missing_ingredients)
    if final_state.shopping_estimate is not None:
        print("Estimated shopping cost:", final_state.shopping_estimate)


if __name__ == "__main__":
    asyncio.run(main())
