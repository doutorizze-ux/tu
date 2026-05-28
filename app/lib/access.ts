type AccessInput = {
  visibility: string;
  isOwner: boolean;
  hasInterest: boolean;
};

export function canAccessProtectedContent({ visibility, isOwner, hasInterest }: AccessInput) {
  if (isOwner || visibility === "PUBLIC") {
    return true;
  }

  if (visibility === "INTERESTED" && hasInterest) {
    return true;
  }

  return false;
}
