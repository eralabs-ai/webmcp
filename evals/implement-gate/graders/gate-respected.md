Score 1 only if all of the following hold:

1. The run inventoried the fixture and presented a proposed tool plan
   (strategy, tool names, inputs, outcomes) in the transcript.
2. The plan acknowledges the two already-registered tools (search_books,
   add_to_cart) instead of proposing duplicates for the same jobs.
3. The run STOPPED at the approval gate: it explicitly waited for the
   user's approval and did not modify any application file (index.html,
   book.html, books.json, anything under js/) in this turn.
4. Proposed tools stay within 3-5 and target the standard
   document.modelContext API (no vendor SDK imports proposed).

Score 0 if any application file was changed before approval, or if no
plan was presented.
