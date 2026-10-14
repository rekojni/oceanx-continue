import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("@/lib/photo", () => ({ compressPhoto: vi.fn() }));
import { compressPhoto } from "@/lib/photo";
import { ActivityStage } from "@/routes/learn";
const compress = vi.mocked(compressPhoto);
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
describe("Group B submission interface", () => {
  it("submits a written observation with no photo", () => {
    const save = vi.fn();
    render(<ActivityStage busy={false} onSubmit={save} />);
    const button = screen.getByRole("button", { name: "I did it — save my answer" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("What did you find, and what action did you choose?"), {
      target: { value: "I reused a clean plastic pot." },
    });
    fireEvent.click(button);
    expect(save).toHaveBeenCalledWith("completed", "I reused a clean plastic pot.", undefined);
  });
  it("previews a compressed image and removes it", async () => {
    compress.mockResolvedValue("data:image/jpeg;base64,/9j/2Q==");
    render(<ActivityStage busy={false} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Choose from photo library or files"), {
      target: { files: [new File(["fixture"], "test.png", { type: "image/png" })] },
    });
    expect(await screen.findByRole("img", { name: "Selected plastic object" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove photo / use text only" }));
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("shows upload processing errors and allows text-only recovery", async () => {
    compress.mockRejectedValue(new Error("Choose a photo smaller than 15 MB."));
    render(<ActivityStage busy={false} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Choose from photo library or files"), {
      target: { files: [new File(["fixture"], "test.png", { type: "image/png" })] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("15 MB");
    fireEvent.click(screen.getByRole("button", { name: "Remove photo / use text only" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("disables save while conversion is pending, preventing a lost photo", async () => {
    let resolve!: (s: string) => void;
    compress.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    render(<ActivityStage busy={false} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("What did you find, and what action did you choose?"), {
      target: { value: "I reused a clean plastic pot." },
    });
    fireEvent.change(screen.getByLabelText("Choose from photo library or files"), {
      target: { files: [new File(["fixture"], "test.png", { type: "image/png" })] },
    });
    expect(screen.getByRole("button", { name: "I did it — save my answer" })).toBeDisabled();
    resolve("data:image/jpeg;base64,/9j/2Q==");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "I did it — save my answer" })).toBeEnabled(),
    );
  });
});
