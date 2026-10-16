import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import { bottomNav, buildNav, initials } from "./nav.ts";

const keys = (roles: string, libraryOn = true, peopleImportOn = true) =>
  buildNav({ roles, libraryOn, peopleImportOn }).map((i) => i.key);

describe("buildNav", () => {
  it("gives every signed in person home and notices", () => {
    expect(keys("")).toEqual(["home", "notices"]);
  });

  it("adds the library for learners when the feature is on", () => {
    expect(keys("learner")).toContain("library");
    expect(keys("learner", false)).not.toContain("library");
  });

  it("shows administration links only to roles that hold the permission", () => {
    expect(keys("learner")).not.toContain("roles");
    const admin = keys("learning_administrator");
    expect(admin).toEqual(expect.arrayContaining(["people", "roles", "wording", "structure", "areas", "activity"]));
  });

  it("hides people when the import feature is off", () => {
    expect(keys("learning_administrator", true, false)).not.toContain("people");
  });

  it("keeps administration links in their own section", () => {
    const sections = buildNav({ roles: "learning_administrator", libraryOn: true, peopleImportOn: true }).map((i) => [i.key, i.section]);
    expect(sections).toContainEqual(["roles", "admin"]);
    expect(sections).toContainEqual(["library", "main"]);
  });

  it("has a label for every menu item", () => {
    for (const item of buildNav({ roles: "learning_administrator", libraryOn: true, peopleImportOn: true })) {
      expect((en.nav as Record<string, string>)[item.key]).toBeTruthy();
      if (item.key !== "home") expect((en.home.cards as Record<string, string>)[item.key]).toBeTruthy();
    }
  });
});

describe("bottomNav", () => {
  it("shows at most four main destinations on phones", () => {
    const items = buildNav({ roles: "learning_administrator", libraryOn: true, peopleImportOn: true });
    const phone = bottomNav(items);
    expect(phone.length).toBeLessThanOrEqual(4);
    expect(phone.every((i) => i.section === "main")).toBe(true);
  });
});

describe("initials", () => {
  it("takes the first and last name", () => {
    expect(initials("Adaeze Okafor")).toBe("AO");
    expect(initials("  ngozi  ")).toBe("N");
    expect(initials("Funke Ada Adeyemi")).toBe("FA");
    expect(initials("")).toBe("");
    expect(initials("Ada alpha (fictional)")).toBe("AA");
  });
});
