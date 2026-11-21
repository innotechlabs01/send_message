import { beforeEach, describe, expect, it, vi } from "vitest";
import { wizard, getCategory, CATEGORIES, PRICE_PER_MESSAGE } from "./wizard-store";

describe("wizard-store unit tests", () => {
  beforeEach(() => {
    wizard.reset();
  });

  describe("draft updates", () => {
    it("updates draft fields incrementally", () => {
      expect(wizard.get().draft.categoryId).toBeNull();

      wizard.setDraft({ categoryId: "cumpleanos" });
      expect(wizard.get().draft.categoryId).toBe("cumpleanos");

      wizard.setDraft({
        recipient: "Laura",
        sender: "Carlos",
        phoneTo: "3001234567",
        phoneFrom: "3109876543",
        sendDate: "2026-12-15",
      });

      const current = wizard.get().draft;
      expect(current.categoryId).toBe("cumpleanos");
      expect(current.recipient).toBe("Laura");
      expect(current.sender).toBe("Carlos");
      expect(current.phoneTo).toBe("3001234567");
      expect(current.phoneFrom).toBe("3109876543");
      expect(current.sendDate).toBe("2026-12-15");
    });

    it("resets draft fields to empty state via resetDraft", () => {
      wizard.setDraft({
        categoryId: "amor",
        message: "Te quiero mucho",
        recipient: "Ana",
      });

      wizard.resetDraft();

      const draft = wizard.get().draft;
      expect(draft.categoryId).toBeNull();
      expect(draft.message).toBeNull();
      expect(draft.recipient).toBe("");
    });
  });

  describe("addItemFromDraft", () => {
    it("returns null and does not add item if categoryId, message or sendDate is missing", () => {
      // Incomplete draft: missing message and sendDate
      wizard.setDraft({ categoryId: "cumpleanos", recipient: "David" });
      const res1 = wizard.addItemFromDraft();
      expect(res1).toBeNull();
      expect(wizard.get().items).toHaveLength(0);

      // Incomplete draft: missing sendDate
      wizard.setDraft({ message: "Hola David" });
      const res2 = wizard.addItemFromDraft();
      expect(res2).toBeNull();
      expect(wizard.get().items).toHaveLength(0);
    });

    it("creates CartItem, appends to items, and clears draft when draft is complete", () => {
      wizard.setDraft({
        categoryId: "graduacion",
        message: "¡Felicitaciones Ingeniero!",
        recipient: "Daniel",
        sender: "Familia",
        phoneFrom: "3001112233",
        phoneTo: "3154445566",
        sendDate: "2026-11-30",
      });

      const added = wizard.addItemFromDraft();
      expect(added).not.toBeNull();
      expect(added?.id).toBeTruthy();
      expect(added?.categoryId).toBe("graduacion");
      expect(added?.message).toBe("¡Felicitaciones Ingeniero!");
      expect(added?.recipient).toBe("Daniel");
      expect(added?.sender).toBe("Familia");
      expect(added?.phoneFrom).toBe("3001112233");
      expect(added?.phoneTo).toBe("3154445566");
      expect(added?.sendDate).toBe("2026-11-30");

      // Verify store items
      const state = wizard.get();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(added);

      // Verify draft is reset
      expect(state.draft.categoryId).toBeNull();
      expect(state.draft.message).toBeNull();
      expect(state.draft.recipient).toBe("");
    });
  });

  describe("removeItem", () => {
    it("removes specified item from cart by ID", () => {
      const item1 = wizard.addItem({
        categoryId: "cumpleanos",
        message: "Msg 1",
        recipient: "Recip 1",
        sender: "Send 1",
        phoneFrom: "3001234567",
        phoneTo: "3101234567",
        sendDate: "2026-12-01",
      });

      const item2 = wizard.addItem({
        categoryId: "aniversario",
        message: "Msg 2",
        recipient: "Recip 2",
        sender: "Send 2",
        phoneFrom: "3009998877",
        phoneTo: "3109998877",
        sendDate: "2026-12-02",
      });

      expect(wizard.get().items).toHaveLength(2);

      wizard.removeItem(item1.id);

      const remaining = wizard.get().items;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(item2.id);
      expect(remaining[0].message).toBe("Msg 2");
    });
  });

  describe("reset", () => {
    it("clears all items and draft state back to empty initial", () => {
      wizard.setDraft({ categoryId: "luto", message: "En paz descanse" });
      wizard.addItem({
        categoryId: "cumpleanos",
        message: "Feliz dia",
        recipient: "Elena",
        sender: "Pedro",
        phoneFrom: "3001234567",
        phoneTo: "3101234567",
        sendDate: "2026-12-10",
      });

      expect(wizard.get().items).toHaveLength(1);
      expect(wizard.get().draft.categoryId).toBe("luto");

      wizard.reset();

      const after = wizard.get();
      expect(after.items).toHaveLength(0);
      expect(after.draft.categoryId).toBeNull();
      expect(after.draft.message).toBeNull();
      expect(after.draft.recipient).toBe("");
    });
  });

  describe("draftFromItem and subscriptions", () => {
    it("loads an existing item into the draft", () => {
      const item = wizard.addItem({
        categoryId: "amor",
        message: "Para ti",
        recipient: "Sara",
        sender: "Mateo",
        phoneFrom: "3001112233",
        phoneTo: "3154445566",
        sendDate: "2026-12-24",
      });

      wizard.draftFromItem(item);

      const draft = wizard.get().draft;
      expect(draft.categoryId).toBe("amor");
      expect(draft.message).toBe("Para ti");
      expect(draft.recipient).toBe("Sara");
      expect(draft.sender).toBe("Mateo");
      expect(draft.sendDate).toBe("2026-12-24");
    });

    it("notifies subscribers when state changes and unsubscribes properly", () => {
      const listener = vi.fn();
      const unsubscribe = wizard.subscribe(listener);

      wizard.setDraft({ recipient: "Test" });
      expect(listener).toHaveBeenCalledTimes(1);

      wizard.reset();
      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
      wizard.setDraft({ recipient: "Another" });
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe("categories and price constant", () => {
    it("defines 5 standard categories with price 4990 COP", () => {
      expect(CATEGORIES).toHaveLength(5);
      expect(PRICE_PER_MESSAGE).toBe(4990);
      expect(getCategory("cumpleanos")?.label).toBe("Cumpleaños");
      expect(getCategory("non_existent")).toBeNull();
    });
  });
});
