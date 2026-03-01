# Validation Rules

Auto-detect and validate common data patterns: email addresses, phone numbers, postal codes, URLs, currency values, and dates. Each section provides regex patterns, normalization functions, and error reporting.

## Email Validation

```python
import re
import pandas as pd

EMAIL_REGEX = re.compile(
    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
)

# Common domain typos and corrections
DOMAIN_CORRECTIONS = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'hotmal.com': 'hotmail.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
    'yaho.com': 'yahoo.com',
    'yahooo.com': 'yahoo.com',
    'yhoo.com': 'yahoo.com',
}

def validate_emails(series: pd.Series) -> pd.DataFrame:
    """Validate emails and return a report DataFrame."""
    results = pd.DataFrame({
        'original': series,
        'cleaned': series.astype(str).str.strip().str.lower(),
        'is_valid': False,
        'issue': '',
        'suggested': '',
    })

    for idx, email in results['cleaned'].items():
        if not email or email in ('', 'nan', 'none'):
            results.at[idx, 'issue'] = 'empty'
            continue

        if not EMAIL_REGEX.match(email):
            results.at[idx, 'issue'] = 'invalid_format'
            continue

        # Check for domain typos
        domain = email.split('@')[1] if '@' in email else ''
        if domain in DOMAIN_CORRECTIONS:
            corrected = email.replace(domain, DOMAIN_CORRECTIONS[domain])
            results.at[idx, 'suggested'] = corrected
            results.at[idx, 'issue'] = 'domain_typo'
            results.at[idx, 'is_valid'] = True  # Valid format, just typo
        else:
            results.at[idx, 'is_valid'] = True

    return results

def clean_emails(series: pd.Series, fix_typos: bool = True) -> pd.Series:
    """Clean and normalize email addresses."""
    cleaned = series.astype(str).str.strip().str.lower()
    cleaned = cleaned.replace({'nan': '', 'none': '', 'n/a': ''})

    if fix_typos:
        for idx, email in cleaned.items():
            if '@' in email:
                domain = email.split('@')[1]
                if domain in DOMAIN_CORRECTIONS:
                    cleaned.at[idx] = email.replace(domain, DOMAIN_CORRECTIONS[domain])

    return cleaned
```

## Phone Number Normalization

```python
def normalize_phones(series: pd.Series, country: str = "US",
                     output_format: str = "e164") -> pd.Series:
    """Normalize phone numbers.

    Args:
        country: Default country code (US, UK, DE, CA, etc.)
        output_format: "e164" (+15551234567), "national" ((555) 123-4567),
                       "digits" (5551234567)
    """
    COUNTRY_CODES = {
        'US': '1', 'CA': '1', 'UK': '44', 'GB': '44',
        'DE': '49', 'FR': '33', 'AU': '61', 'JP': '81',
        'IN': '91', 'BR': '55', 'MX': '52',
    }

    def normalize_one(phone: str, country_code: str) -> str:
        if not phone or phone in ('nan', 'none', ''):
            return ''

        # Strip all non-digit characters except leading +
        has_plus = phone.startswith('+')
        digits = re.sub(r'[^\d]', '', phone)

        if not digits:
            return ''

        # Handle leading country code
        if has_plus or len(digits) > 10:
            # Already has country code
            if digits.startswith(country_code):
                digits = digits[len(country_code):]

        # Ensure we have enough digits
        if country_code == '1' and len(digits) == 10:
            # US/CA: 10-digit national number
            if output_format == 'e164':
                return f"+1{digits}"
            elif output_format == 'national':
                return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
            else:
                return digits
        elif len(digits) >= 7:
            if output_format == 'e164':
                return f"+{country_code}{digits}"
            else:
                return digits

        return phone  # Return original if can't parse

    cc = COUNTRY_CODES.get(country.upper(), '1')
    return series.astype(str).apply(lambda x: normalize_one(x, cc))

def detect_phone_columns(df: pd.DataFrame) -> list[str]:
    """Auto-detect columns that likely contain phone numbers."""
    phone_keywords = ['phone', 'tel', 'mobile', 'cell', 'fax', 'telephone']
    candidates: list[str] = []

    for col in df.columns:
        name_lower = str(col).lower()
        if any(kw in name_lower for kw in phone_keywords):
            candidates.append(col)
            continue

        # Check content pattern (if string column with digit-heavy values)
        if df[col].dtype == object:
            sample = df[col].dropna().head(20).astype(str)
            digit_ratio = sample.str.replace(r'[^\d]', '', regex=True).str.len().mean()
            total_len = sample.str.len().mean()
            if total_len > 0 and digit_ratio / total_len > 0.6 and 7 <= digit_ratio <= 15:
                candidates.append(col)

    return candidates
```

## Postal Code / Zip Code Validation

```python
POSTAL_PATTERNS = {
    'US': {
        'regex': re.compile(r'^\d{5}(-\d{4})?$'),
        'normalize': lambda x: x.zfill(5) if x.isdigit() and len(x) < 5 else x,
        'description': 'US ZIP: 12345 or 12345-6789',
    },
    'CA': {
        'regex': re.compile(r'^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$'),
        'normalize': lambda x: f"{x[:3].upper()} {x[3:].upper()}".strip() if len(x.replace(' ', '')) == 6 else x,
        'description': 'Canadian: A1A 1A1',
    },
    'UK': {
        'regex': re.compile(r'^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$'),
        'normalize': lambda x: x.upper().strip(),
        'description': 'UK: SW1A 1AA, EC2R 8AH',
    },
    'DE': {
        'regex': re.compile(r'^\d{5}$'),
        'normalize': lambda x: x.zfill(5) if x.isdigit() else x,
        'description': 'German: 10115',
    },
    'FR': {
        'regex': re.compile(r'^\d{5}$'),
        'normalize': lambda x: x.zfill(5) if x.isdigit() else x,
        'description': 'French: 75001',
    },
    'AU': {
        'regex': re.compile(r'^\d{4}$'),
        'normalize': lambda x: x.zfill(4) if x.isdigit() else x,
        'description': 'Australian: 2000',
    },
}

def validate_postal_codes(series: pd.Series,
                          country: str = "US") -> pd.DataFrame:
    """Validate postal codes for a given country."""
    pattern = POSTAL_PATTERNS.get(country.upper())
    if not pattern:
        raise ValueError(f"Unsupported country: {country}. Supported: {list(POSTAL_PATTERNS.keys())}")

    results = pd.DataFrame({
        'original': series,
        'normalized': '',
        'is_valid': False,
    })

    for idx, val in series.items():
        val_str = str(val).strip()
        if not val_str or val_str in ('nan', 'none', ''):
            continue

        normalized = pattern['normalize'](val_str)
        results.at[idx, 'normalized'] = normalized
        results.at[idx, 'is_valid'] = bool(pattern['regex'].match(normalized))

    return results

def normalize_postal_codes(series: pd.Series, country: str = "US") -> pd.Series:
    """Normalize postal codes for a given country."""
    pattern = POSTAL_PATTERNS.get(country.upper())
    if not pattern:
        return series

    return series.astype(str).str.strip().apply(
        lambda x: pattern['normalize'](x) if x not in ('nan', 'none', '') else ''
    )
```

## URL Validation

```python
URL_REGEX = re.compile(
    r'^https?://'                          # http:// or https://
    r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
    r'localhost|'                           # localhost
    r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # or ip
    r'(?::\d+)?'                           # optional port
    r'(?:/?|[/?]\S+)$',                    # path
    re.IGNORECASE
)

def validate_urls(series: pd.Series) -> pd.Series:
    """Validate URLs, return boolean mask."""
    return series.astype(str).str.strip().apply(
        lambda x: bool(URL_REGEX.match(x)) if x not in ('nan', 'none', '') else False
    )

def normalize_urls(series: pd.Series) -> pd.Series:
    """Normalize URLs: ensure https prefix, strip trailing slashes."""
    def normalize_one(url: str) -> str:
        url = url.strip()
        if not url or url in ('nan', 'none', ''):
            return ''
        # Add https:// if no scheme
        if not url.startswith(('http://', 'https://')):
            url = f"https://{url}"
        # Strip trailing slash
        url = url.rstrip('/')
        return url

    return series.astype(str).apply(normalize_one)
```

## Currency Normalization

```python
def normalize_currency(series: pd.Series, locale: str = "US") -> pd.Series:
    """Parse currency strings into numeric values.

    Handles: $1,234.56, 1.234,56 EUR, 1 234,56, etc.
    """
    LOCALE_CONFIGS = {
        'US': {'thousands': ',', 'decimal': '.'},
        'EU': {'thousands': '.', 'decimal': ','},
        'CH': {'thousands': "'", 'decimal': '.'},
        'IN': {'thousands': ',', 'decimal': '.'},
    }

    config = LOCALE_CONFIGS.get(locale.upper(), LOCALE_CONFIGS['US'])

    def parse_one(val: str) -> float | None:
        val = str(val).strip()
        if not val or val in ('nan', 'none', '', '-'):
            return None

        # Remove currency symbols and whitespace
        val = re.sub(r'[^\d\.,\-\'\s]', '', val).strip()

        if not val:
            return None

        # Handle locale-specific separators
        if config['thousands'] in val and config['decimal'] in val:
            val = val.replace(config['thousands'], '')
            val = val.replace(config['decimal'], '.')
        elif config['decimal'] == ',' and ',' in val:
            val = val.replace('.', '').replace(',', '.')
        elif config['thousands'] == ',' and ',' in val:
            val = val.replace(',', '')

        # Handle space as thousands separator
        val = val.replace(' ', '').replace("'", '')

        try:
            return float(val)
        except ValueError:
            return None

    return series.apply(parse_one)
```

## Date Format Standardization

```python
def standardize_dates(series: pd.Series,
                      output_format: str = "%Y-%m-%d",
                      dayfirst: bool = False) -> pd.Series:
    """Parse dates in mixed formats and standardize to a single format."""
    parsed = pd.to_datetime(series, format='mixed', dayfirst=dayfirst, errors='coerce')
    return parsed.dt.strftime(output_format).replace('NaT', '')

def detect_date_columns(df: pd.DataFrame) -> list[str]:
    """Auto-detect columns that likely contain dates."""
    date_keywords = ['date', 'time', 'created', 'modified', 'updated',
                     'born', 'birth', 'start', 'end', 'due', 'scheduled']
    candidates: list[str] = []

    for col in df.columns:
        name_lower = str(col).lower()
        if any(kw in name_lower for kw in date_keywords):
            candidates.append(col)
            continue

        # Check content pattern
        if df[col].dtype == object:
            sample = df[col].dropna().head(10).astype(str)
            try:
                parsed = pd.to_datetime(sample, format='mixed', errors='coerce')
                if parsed.notna().mean() > 0.7:
                    candidates.append(col)
            except Exception:
                pass

    return candidates
```

## Custom Validation Rule Pattern

Define reusable validation rules as a configuration:

```python
from dataclasses import dataclass
from typing import Callable

@dataclass
class ValidationRule:
    name: str
    column: str
    check: Callable[[pd.Series], pd.Series]  # Returns boolean mask (True = valid)
    severity: str = "error"  # "error", "warning", "info"
    message: str = ""

def apply_validation_rules(df: pd.DataFrame,
                           rules: list[ValidationRule]) -> pd.DataFrame:
    """Apply validation rules and generate a report."""
    report_rows: list[dict] = []

    for rule in rules:
        if rule.column not in df.columns:
            report_rows.append({
                'rule': rule.name,
                'column': rule.column,
                'severity': 'warning',
                'message': f"Column '{rule.column}' not found",
                'invalid_count': 0,
                'total_count': len(df),
            })
            continue

        valid_mask = rule.check(df[rule.column])
        invalid_count = (~valid_mask).sum()

        report_rows.append({
            'rule': rule.name,
            'column': rule.column,
            'severity': rule.severity,
            'message': rule.message or f"{invalid_count} rows failed {rule.name}",
            'invalid_count': int(invalid_count),
            'total_count': len(df),
        })

        # Flag invalid rows in the DataFrame
        df[f"_valid_{rule.column}_{rule.name}"] = valid_mask

    report = pd.DataFrame(report_rows)
    return df, report

# Example usage
STANDARD_RULES = [
    ValidationRule(
        name="email_format",
        column="email",
        check=lambda s: s.astype(str).str.match(EMAIL_REGEX).fillna(False),
        severity="error",
        message="Invalid email format"
    ),
    ValidationRule(
        name="phone_length",
        column="phone",
        check=lambda s: s.astype(str).str.replace(r'[^\d]', '', regex=True).str.len().between(7, 15),
        severity="warning",
        message="Phone number has unusual length"
    ),
    ValidationRule(
        name="zip_format",
        column="zip_code",
        check=lambda s: s.astype(str).str.match(r'^\d{5}(-\d{4})?$').fillna(False),
        severity="error",
        message="Invalid US ZIP code"
    ),
    ValidationRule(
        name="positive_amount",
        column="amount",
        check=lambda s: pd.to_numeric(s, errors='coerce') >= 0,
        severity="error",
        message="Amount must be non-negative"
    ),
]
```

## Auto-Detection: Identify Column Types

```python
def auto_detect_validations(df: pd.DataFrame) -> list[ValidationRule]:
    """Auto-detect which validation rules to apply based on column names and content."""
    rules: list[ValidationRule] = []

    for col in df.columns:
        name = str(col).lower()

        if any(kw in name for kw in ['email', 'e_mail']):
            rules.append(ValidationRule("email_format", col,
                lambda s: s.astype(str).str.match(EMAIL_REGEX).fillna(False),
                "error", "Invalid email format"))

        elif any(kw in name for kw in ['phone', 'tel', 'mobile', 'cell']):
            rules.append(ValidationRule("phone_format", col,
                lambda s: s.astype(str).str.replace(r'[^\d]', '', regex=True).str.len().between(7, 15),
                "warning", "Invalid phone number"))

        elif any(kw in name for kw in ['zip', 'postal', 'postcode']):
            rules.append(ValidationRule("postal_format", col,
                lambda s: s.astype(str).str.match(r'^\d{5}(-\d{4})?$').fillna(False) | (s.astype(str) == ''),
                "warning", "Invalid postal code"))

        elif any(kw in name for kw in ['url', 'website', 'link', 'href']):
            rules.append(ValidationRule("url_format", col,
                lambda s: s.astype(str).apply(lambda x: bool(URL_REGEX.match(x)) if x not in ('', 'nan') else True),
                "warning", "Invalid URL"))

    return rules
```
