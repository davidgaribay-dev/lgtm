"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


interface SettingsUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  description?: string | null;
}

interface SettingsContentProps {
  user: SettingsUser;
}

export function SettingsContent({ user }: SettingsContentProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Update your name, photo, and personal details.
        </p>
      </div>

      <ProfileSection user={user} />
    </div>
  );
}

function ProfileSection({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [description, setDescription] = useState(user.description ?? "");
  const [imageUrl, setImageUrl] = useState(user.image ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("context", "profile-image");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setImageUrl(url);
    } catch {
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved(false);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setIsSaving(true);

    const { error } = await authClient.updateUser({
      name: name.trim(),
      image: imageUrl || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      description: description.trim() || null,
    } as any);

    if (error) {
      setError(error.message || "Failed to update profile.");
      setIsSaving(false);
      return;
    }

    setSaved(true);
    setIsSaving(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Update your name, photo, and personal details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {saved && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Profile updated.
            </p>
          )}

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={imageUrl || undefined} alt={user.name} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-foreground"
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Click the camera icon to upload a new photo.</p>
              <p>JPG, PNG, WebP, or GIF. 5 MB max.</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
                setSaved(false);
              }}
              disabled={isSaving}
              required
              autoComplete="name"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError("");
                setSaved(false);
              }}
              disabled={isSaving}
              placeholder="A short bio about yourself"
              autoComplete="off"
            />
          </div>

          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="animate-spin" />}
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
