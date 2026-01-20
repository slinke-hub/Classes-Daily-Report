$vars = @(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID"
)

$values = @{
    "NEXT_PUBLIC_FIREBASE_API_KEY"             = "AIzaSyDk3mnCJcQoP3wCZ5ubi6Owvw6bZoSZ2_I";
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"         = "gpa-class-reports.firebaseapp.com";
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"          = "gpa-class-reports";
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"      = "gpa-class-reports.appspot.com";
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" = "932091328883";
    "NEXT_PUBLIC_FIREBASE_APP_ID"              = "y1:932091328883:web:d9fcf107d70638cc73ad06"
}

$targets = @("production", "preview", "development")

foreach ($key in $vars) {
    foreach ($target in $targets) {
        Write-Host "Removing $key from $target..."
        # Try to remove, ignore errors if it doesn't exist
        npx vercel env rm $key $target -y 2>$null
    }
}

foreach ($key in $vars) {
    foreach ($target in $targets) {
        Write-Host "Adding $key to $target..."
        Write-Output $values[$key] | npx vercel env add $key $target
    }
}
