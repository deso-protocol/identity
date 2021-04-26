interface Document {
  hasStorageAccess: () => Promise<boolean>;
  requestStorageAccess: () => Promise<void>;
}
