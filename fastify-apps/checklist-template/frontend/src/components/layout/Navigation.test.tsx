import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { Navigation } from "./Navigation";

describe("Navigation", () => {
  const renderWithRouter = (ui: JSX.Element) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  it("renders the application title", () => {
    renderWithRouter(<Navigation />);
    expect(screen.getByRole("link", { name: /checklist studio/i })).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    renderWithRouter(<Navigation />);
    expect(screen.getByRole("link", { name: /templates/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /checklists/i })).toBeInTheDocument();
  });

  it("marks templates link active on templates route", () => {
    render(
      <MemoryRouter initialEntries={["/templates"]}>
        <Navigation />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /templates/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks checklists link active on checklists route", () => {
    render(
      <MemoryRouter initialEntries={["/checklists"]}>
        <Navigation />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /checklists/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("keeps links inactive on other routes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navigation />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /templates/i })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: /checklists/i })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("has expected href targets", () => {
    renderWithRouter(<Navigation />);
    expect(screen.getByRole("link", { name: /checklist studio/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: /templates/i })).toHaveAttribute(
      "href",
      "/templates",
    );
    expect(screen.getByRole("link", { name: /checklists/i })).toHaveAttribute(
      "href",
      "/checklists",
    );
  });
});
