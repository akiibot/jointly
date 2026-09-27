export interface Profile {
  id: string;
  displayName: string;
}

export class ProfileStore {
  private readonly profiles = new Map<string, Profile>();
  private readonly revisions = new Map<string, number>();

  save(profile: Profile): void {
    this.profiles.set(profile.id, { ...profile });
    this.revisions.set(profile.id, (this.revisions.get(profile.id) ?? 0) + 1);
  }

  findById(id: string): Profile | undefined {
    const profile = this.profiles.get(id);
    return profile ? { ...profile } : undefined;
  }

  revision(id: string): number {
    return this.revisions.get(id) ?? 0;
  }
}
